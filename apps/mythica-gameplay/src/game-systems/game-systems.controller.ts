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

/** Champs de mapping d'une propriété au sein d'un système. */
const PropertyMappingFields = {
	displayOrder: t.Optional(t.Integer()),
	groupName: t.Optional(t.String({ maxLength: 100 })),
	isRequired: t.Optional(t.Boolean()),
	overrideLabel: t.Optional(t.String({ maxLength: 255 })),
	overrideDefault: t.Optional(t.String()),
	formula: t.Optional(t.String()),
};

/** Attache une propriété : par id de catalogue ou par key, plus le mapping. */
const AttachPropertyBody = t.Object({
	propertyId: t.Optional(t.String({ format: "uuid" })),
	propertyKey: t.Optional(t.String({ maxLength: 100 })),
	...PropertyMappingFields,
});

const UpdatePropertyMappingBody = t.Object(PropertyMappingFields);

/** Type des propriétés de fiche (enum PropertyType). */
const PropertyTypeSchema = t.Union([
	t.Literal("text"),
	t.Literal("number"),
	t.Literal("boolean"),
	t.Literal("select"),
	t.Literal("multiselect"),
	t.Literal("textarea"),
	t.Literal("resource"),
	t.Literal("list"),
	t.Literal("derived"),
]);

/** Entrée de fiche type : mapping fusionné avec le détail de la propriété. */
const GameSystemPropertySchema = t.Object({
	propertyId: t.String(),
	key: t.String(),
	label: t.String(),
	type: PropertyTypeSchema,
	options: t.Union([t.Unknown(), t.Null()]),
	defaultValue: t.Union([t.String(), t.Null()]),
	description: t.Union([t.String(), t.Null()]),
	groupName: t.Union([t.String(), t.Null()]),
	displayOrder: t.Integer(),
	isRequired: t.Boolean(),
	formula: t.Union([t.String(), t.Null()]),
});

const ListQuery = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1 })),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	search: t.Optional(t.String()),
});

/** Code d'erreur Prisma pour violation de contrainte d'unicité. */
const PRISMA_UNIQUE_VIOLATION = "P2002";
/** Code d'erreur Prisma pour violation de clé étrangère. */
const PRISMA_FK_VIOLATION = "P2003";
/** Code d'erreur Prisma pour enregistrement introuvable. */
const PRISMA_NOT_FOUND = "P2025";

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

	/** GET /game-systems/:id/properties - Fiche type d'un système */
	.get(
		"/:id/properties",
		async ({ set, params }) => {
			const gameSystem = await prisma.gameSystem.findUnique({
				where: { id: params.id },
			});
			if (!gameSystem) {
				set.status = 404;
				return {
					success: false as const,
					error: "Système de jeu introuvable",
				};
			}

			const mappings = await prisma.gameSystemProperty.findMany({
				where: { gameSystemId: params.id },
				include: { property: true },
				orderBy: { displayOrder: "asc" },
			});

			const properties = mappings.map((m) => ({
				propertyId: m.propertyId,
				key: m.property.key,
				label: m.overrideLabel ?? m.property.label,
				type: m.property.type,
				options: m.property.options ?? null,
				defaultValue: m.overrideDefault ?? m.property.defaultValue,
				description: m.property.description,
				groupName: m.groupName,
				displayOrder: m.displayOrder,
				isRequired: m.isRequired,
				formula: m.formula,
			}));

			return { success: true as const, properties };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					properties: t.Array(GameSystemPropertySchema),
				}),
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Fiche type d'un système de jeu",
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
	)

	// ==================== PROPRIÉTÉS D'UN SYSTÈME ====================

	/** POST /game-systems/:id/properties - Attacher une propriété au système */
	.post(
		"/:id/properties",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const gameSystem = await prisma.gameSystem.findUnique({
				where: { id: params.id },
			});
			if (!gameSystem) {
				set.status = 404;
				return { success: false as const, error: "Système de jeu introuvable" };
			}

			if (!body.propertyId && !body.propertyKey) {
				set.status = 400;
				return {
					success: false as const,
					error: "propertyId ou propertyKey requis",
				};
			}

			const property = await prisma.characterSheetProperty.findUnique({
				where: body.propertyId
					? { id: body.propertyId }
					: { key: body.propertyKey as string },
			});
			if (!property) {
				set.status = 404;
				return { success: false as const, error: "Propriété introuvable" };
			}

			try {
				const created = await prisma.gameSystemProperty.create({
					data: {
						id: newId(),
						gameSystemId: params.id,
						propertyId: property.id,
						displayOrder: body.displayOrder ?? 0,
						groupName: body.groupName ?? null,
						isRequired: body.isRequired ?? false,
						overrideLabel: body.overrideLabel ?? null,
						overrideDefault: body.overrideDefault ?? null,
						formula: body.formula ?? null,
					},
				});
				set.status = 201;
				return { success: true as const, id: created.id };
			} catch (err) {
				if (prismaErrorCode(err) === PRISMA_UNIQUE_VIOLATION) {
					set.status = 409;
					return {
						success: false as const,
						error: "Cette propriété est déjà attachée au système",
					};
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String() }),
			body: AttachPropertyBody,
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Attacher une propriété à un système de jeu",
			},
		},
	)

	/** PATCH /game-systems/:id/properties/:propertyId - Modifier le mapping */
	.patch(
		"/:id/properties/:propertyId",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			try {
				await prisma.gameSystemProperty.update({
					where: {
						gameSystemId_propertyId: {
							gameSystemId: params.id,
							propertyId: params.propertyId,
						},
					},
					data: {
						displayOrder: body.displayOrder,
						groupName: body.groupName,
						isRequired: body.isRequired,
						overrideLabel: body.overrideLabel,
						overrideDefault: body.overrideDefault,
						formula: body.formula,
					},
				});
				return {
					success: true as const,
					message: "Mapping de propriété modifié",
				};
			} catch (err) {
				if (prismaErrorCode(err) === PRISMA_NOT_FOUND) {
					set.status = 404;
					return {
						success: false as const,
						error: "Propriété non attachée à ce système",
					};
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String(), propertyId: t.String() }),
			body: UpdatePropertyMappingBody,
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Modifier le mapping d'une propriété d'un système de jeu",
			},
		},
	)

	/** DELETE /game-systems/:id/properties/:propertyId - Retirer une propriété */
	.delete(
		"/:id/properties/:propertyId",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			try {
				await prisma.gameSystemProperty.delete({
					where: {
						gameSystemId_propertyId: {
							gameSystemId: params.id,
							propertyId: params.propertyId,
						},
					},
				});
				return {
					success: true as const,
					message: "Propriété retirée du système",
				};
			} catch (err) {
				if (prismaErrorCode(err) === PRISMA_NOT_FOUND) {
					set.status = 404;
					return {
						success: false as const,
						error: "Propriété non attachée à ce système",
					};
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String(), propertyId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Retirer une propriété d'un système de jeu",
			},
		},
	);
