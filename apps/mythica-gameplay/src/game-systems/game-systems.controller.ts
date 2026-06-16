import { Elysia, t } from "elysia";
import { authContext, isAdmin } from "../auth/context";
import { ErrorResponse, SuccessMessageResponse } from "../lib/http";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";

/** Représentation publique d'un système de jeu. */
const GameSystemSchema = t.Object({
	id: t.String({ format: "uuid" }),
	nom: t.String(),
	version: t.String(),
	slug: t.String(),
	parentSystemId: t.Union([t.String(), t.Null()]),
	isOfficial: t.Boolean(),
	description: t.Union([t.String(), t.Null()]),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

const CreateGameSystemBody = t.Object({
	nom: t.String({ minLength: 1, maxLength: 255 }),
	version: t.String({ minLength: 1, maxLength: 50 }),
	slug: t.String({ minLength: 1, maxLength: 100 }),
	description: t.Optional(t.String()),
	parentSystemId: t.Optional(t.String({ format: "uuid" })),
	isOfficial: t.Optional(t.Boolean()),
});

const UpdateGameSystemBody = t.Partial(CreateGameSystemBody);

const ListQuery = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1 })),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	search: t.Optional(t.String()),
});

/** Code d'erreur Prisma pour violation de contrainte d'unicité. */
const PRISMA_UNIQUE_VIOLATION = "P2002";
/** Code d'erreur Prisma pour violation de clé étrangère. */
const PRISMA_FK_VIOLATION = "P2003";

function prismaErrorCode(err: unknown): string | undefined {
	return (err as { code?: string }).code;
}

export const gameSystemsController = new Elysia({ prefix: "/game-systems" })
	.use(authContext)

	// ==================== LECTURE ====================

	/** GET /game-systems - Liste paginée des systèmes de jeu */
	.get(
		"/",
		async ({ query }) => {
			const page = query.page ?? 1;
			const limit = query.limit ?? 20;
			const where = query.search
				? {
						OR: [
							{ nom: { contains: query.search, mode: "insensitive" as const } },
							{
								slug: { contains: query.search, mode: "insensitive" as const },
							},
						],
					}
				: {};

			const [items, total] = await Promise.all([
				prisma.gameSystem.findMany({
					where,
					skip: (page - 1) * limit,
					take: limit,
					orderBy: { createdAt: "desc" },
				}),
				prisma.gameSystem.count({ where }),
			]);

			return { success: true as const, items, total, page, limit };
		},
		{
			query: ListQuery,
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(GameSystemSchema),
					total: t.Integer(),
					page: t.Integer(),
					limit: t.Integer(),
				}),
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Liste des systèmes de jeu",
			},
		},
	)

	/** GET /game-systems/:id - Détails d'un système de jeu */
	.get(
		"/:id",
		async ({ set, params }) => {
			const gameSystem = await prisma.gameSystem.findUnique({
				where: { id: params.id },
			});
			if (!gameSystem) {
				set.status = 404;
				return { success: false as const, error: "Système de jeu introuvable" };
			}
			return { success: true as const, gameSystem };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					gameSystem: GameSystemSchema,
				}),
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Détails d'un système de jeu",
			},
		},
	)

	// ==================== MUTATIONS ====================

	/**
	 * POST /game-systems - Créer un système de jeu.
	 *
	 * Ouvert à tout utilisateur authentifié : un MJ peut créer un système
	 * custom, éventuellement en forkant un système parent (les propriétés du
	 * parent sont alors copiées comme point de départ). Seuls les admins
	 * peuvent créer un système officiel ; pour les non-admins, `isOfficial`
	 * est forcé à `false`.
	 */
	.post(
		"/",
		async ({ set, currentUser, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			// Un non-admin ne peut jamais créer un système officiel.
			const isOfficial = isAdmin(currentUser)
				? (body.isOfficial ?? false)
				: false;

			// Validation du parent (fork) avant toute écriture.
			if (body.parentSystemId) {
				const parent = await prisma.gameSystem.findUnique({
					where: { id: body.parentSystemId },
					select: { id: true },
				});
				if (!parent) {
					set.status = 404;
					return {
						success: false as const,
						error: "Système parent introuvable",
					};
				}
			}

			const newSystemId = newId();

			try {
				await prisma.$transaction(async (tx) => {
					await tx.gameSystem.create({
						data: {
							id: newSystemId,
							nom: body.nom,
							version: body.version,
							slug: body.slug,
							description: body.description ?? null,
							parentSystemId: body.parentSystemId ?? null,
							isOfficial,
						},
					});

					// Fork : on copie les propriétés du parent comme point de départ.
					if (body.parentSystemId) {
						const parentProps = await tx.gameSystemProperty.findMany({
							where: { gameSystemId: body.parentSystemId },
						});
						if (parentProps.length > 0) {
							await tx.gameSystemProperty.createMany({
								data: parentProps.map((prop) => ({
									id: newId(),
									gameSystemId: newSystemId,
									propertyId: prop.propertyId,
									displayOrder: prop.displayOrder,
									groupName: prop.groupName,
									isRequired: prop.isRequired,
									overrideLabel: prop.overrideLabel,
									overrideDefault: prop.overrideDefault,
									formula: prop.formula,
								})),
							});
						}
					}
				});

				set.status = 201;
				return { success: true as const, id: newSystemId };
			} catch (err) {
				if (prismaErrorCode(err) === PRISMA_UNIQUE_VIOLATION) {
					set.status = 409;
					return { success: false as const, error: "Ce slug existe déjà" };
				}
				throw err;
			}
		},
		{
			body: CreateGameSystemBody,
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Créer un système de jeu",
			},
		},
	)

	/** PUT /game-systems/:id - Modifier un système de jeu (admin) */
	.put(
		"/:id",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			try {
				await prisma.gameSystem.update({
					where: { id: params.id },
					data: {
						nom: body.nom,
						version: body.version,
						slug: body.slug,
						description: body.description,
						parentSystemId: body.parentSystemId,
						isOfficial: body.isOfficial,
					},
				});
				return { success: true as const, message: "Système de jeu modifié" };
			} catch (err) {
				const code = prismaErrorCode(err);
				if (code === "P2025") {
					set.status = 404;
					return {
						success: false as const,
						error: "Système de jeu introuvable",
					};
				}
				if (code === PRISMA_UNIQUE_VIOLATION) {
					set.status = 409;
					return { success: false as const, error: "Ce slug existe déjà" };
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: UpdateGameSystemBody,
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Modifier un système de jeu",
			},
		},
	)

	/** DELETE /game-systems/:id - Supprimer un système de jeu (admin) */
	.delete(
		"/:id",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			try {
				await prisma.gameSystem.delete({ where: { id: params.id } });
				return { success: true as const, message: "Système de jeu supprimé" };
			} catch (err) {
				const code = prismaErrorCode(err);
				if (code === "P2025") {
					set.status = 404;
					return {
						success: false as const,
						error: "Système de jeu introuvable",
					};
				}
				if (code === PRISMA_FK_VIOLATION) {
					set.status = 409;
					return {
						success: false as const,
						error: "Système de jeu utilisé par des campagnes ou des fiches",
					};
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Supprimer un système de jeu",
			},
		},
	);
