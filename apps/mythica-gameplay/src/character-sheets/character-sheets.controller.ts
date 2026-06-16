import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { ErrorResponse } from "../lib/http";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";

/** Code d'erreur Prisma pour violation de clé étrangère. */
const PRISMA_FK_VIOLATION = "P2003";

function prismaErrorCode(err: unknown): string | undefined {
	return (err as { code?: string }).code;
}

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

/** Représentation publique compacte d'un système (pour les listes/détails). */
const GameSystemBriefSchema = t.Object({
	id: t.String(),
	nom: t.String(),
	slug: t.String(),
	version: t.String(),
});

/** Une valeur de fiche : la valeur JSON brute associée à une propriété. */
const SheetValueSchema = t.Object({
	propertyId: t.String(),
	key: t.String(),
	value: t.Unknown(),
});

/** Fiche telle que renvoyée dans la liste « mes fiches ». */
const CharacterSheetListItemSchema = t.Object({
	id: t.String(),
	name: t.String(),
	gameSystemId: t.String(),
	gameSystem: GameSystemBriefSchema,
	avatarFileId: t.Union([t.String(), t.Null()]),
	isActive: t.Boolean(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
	values: t.Array(SheetValueSchema),
});

/**
 * Entrée de fiche assemblée : le mapping système fusionné avec le détail de la
 * propriété et la valeur courante de la fiche (null si jamais saisie).
 *
 * Pour les propriétés `derived`, `value` reste null et `formula` est exposée :
 * le calcul est réalisé côté client (FEAT-195), car les formules seedées sont
 * des helpers nommés sans implémentation serveur.
 */
const CharacterSheetPropertySchema = t.Object({
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
	value: t.Unknown(),
});

const CharacterSheetDetailSchema = t.Object({
	id: t.String(),
	name: t.String(),
	gameSystemId: t.String(),
	gameSystem: GameSystemBriefSchema,
	avatarFileId: t.Union([t.String(), t.Null()]),
	isActive: t.Boolean(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
	properties: t.Array(CharacterSheetPropertySchema),
});

const CreateCharacterSheetBody = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	gameSystemId: t.String({ format: "uuid" }),
	avatarFileId: t.Optional(t.String({ format: "uuid" })),
});

const ListQuery = t.Object({
	gameSystemId: t.Optional(t.String()),
});

const UpdateValuesBody = t.Array(
	t.Object({
		propertyId: t.String({ format: "uuid" }),
		value: t.Unknown(),
	}),
);

/** Brief système (sélection Prisma partagée). */
const gameSystemBriefSelect = {
	id: true,
	nom: true,
	slug: true,
	version: true,
} as const;

export const characterSheetsController = new Elysia({
	prefix: "/character-sheets",
})
	.use(authContext)

	/**
	 * POST /character-sheets - Créer une fiche de personnage standalone.
	 *
	 * Crée la fiche pour l'utilisateur courant et initialise automatiquement
	 * les valeurs des propriétés `is_required=true` du système avec leur
	 * valeur par défaut (override du mapping prioritaire sur le catalogue).
	 */
	.post(
		"/",
		async ({ set, currentUser, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const gameSystem = await prisma.gameSystem.findUnique({
				where: { id: body.gameSystemId },
				select: { id: true },
			});
			if (!gameSystem) {
				set.status = 404;
				return { success: false as const, error: "Système de jeu introuvable" };
			}

			const newSheetId = newId();

			try {
				await prisma.$transaction(async (tx) => {
					await tx.characterSheet.create({
						data: {
							id: newSheetId,
							userId: currentUser.id,
							gameSystemId: body.gameSystemId,
							name: body.name,
							avatarFileId: body.avatarFileId ?? null,
						},
					});

					// Initialisation des valeurs requises avec leur défaut résolu.
					const required = await tx.gameSystemProperty.findMany({
						where: { gameSystemId: body.gameSystemId, isRequired: true },
						include: { property: { select: { defaultValue: true } } },
					});
					if (required.length > 0) {
						await tx.characterSheetValue.createMany({
							data: required.map((m) => {
								const def = m.overrideDefault ?? m.property.defaultValue;
								return {
									id: newId(),
									characterSheetId: newSheetId,
									propertyId: m.propertyId,
									// Valeur JSON brute ; {} (défaut colonne) si aucun défaut.
									value: def ?? {},
								};
							}),
						});
					}
				});

				set.status = 201;
				return { success: true as const, id: newSheetId };
			} catch (err) {
				// avatarFileId inexistant -> violation de clé étrangère.
				if (prismaErrorCode(err) === PRISMA_FK_VIOLATION) {
					set.status = 400;
					return {
						success: false as const,
						error: "Référence invalide (avatar ou système)",
					};
				}
				throw err;
			}
		},
		{
			body: CreateCharacterSheetBody,
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["CharacterSheets"],
				summary: "Créer une fiche de personnage standalone",
			},
		},
	)

	/**
	 * GET /character-sheets - Mes fiches de personnage.
	 *
	 * Renvoie les fiches non supprimées de l'utilisateur courant, avec leur
	 * système et leurs valeurs (clé + valeur) pour l'affichage des cards.
	 */
	.get(
		"/",
		async ({ set, currentUser, query }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const sheets = await prisma.characterSheet.findMany({
				where: {
					userId: currentUser.id,
					deletedAt: null,
					...(query.gameSystemId ? { gameSystemId: query.gameSystemId } : {}),
				},
				orderBy: { updatedAt: "desc" },
				include: {
					gameSystem: { select: gameSystemBriefSelect },
					values: { include: { property: { select: { key: true } } } },
				},
			});

			const items = sheets.map((s) => ({
				id: s.id,
				name: s.name,
				gameSystemId: s.gameSystemId,
				gameSystem: s.gameSystem,
				avatarFileId: s.avatarFileId,
				isActive: s.isActive,
				createdAt: s.createdAt,
				updatedAt: s.updatedAt,
				values: s.values.map((v) => ({
					propertyId: v.propertyId,
					key: v.property.key,
					value: v.value,
				})),
			}));

			return { success: true as const, items };
		},
		{
			query: ListQuery,
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(CharacterSheetListItemSchema),
				}),
				401: ErrorResponse,
			},
			detail: {
				tags: ["CharacterSheets"],
				summary: "Liste de mes fiches de personnage",
			},
		},
	)

	/**
	 * GET /character-sheets/:id - Détail complet d'une fiche.
	 *
	 * Assemble la fiche type (game_system_properties du système, triées par
	 * displayOrder) fusionnée avec les valeurs saisies. Réservé au propriétaire.
	 */
	.get(
		"/:id",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const sheet = await prisma.characterSheet.findUnique({
				where: { id: params.id },
				include: {
					gameSystem: { select: gameSystemBriefSelect },
					values: true,
				},
			});
			if (!sheet || sheet.deletedAt) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}
			if (sheet.userId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const mappings = await prisma.gameSystemProperty.findMany({
				where: { gameSystemId: sheet.gameSystemId },
				include: { property: true },
				orderBy: { displayOrder: "asc" },
			});

			// Index des valeurs saisies par propertyId pour la fusion.
			const valueByProperty = new Map(
				sheet.values.map((v) => [v.propertyId, v.value]),
			);

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
				value: valueByProperty.has(m.propertyId)
					? valueByProperty.get(m.propertyId)
					: null,
			}));

			return {
				success: true as const,
				id: sheet.id,
				name: sheet.name,
				gameSystemId: sheet.gameSystemId,
				gameSystem: sheet.gameSystem,
				avatarFileId: sheet.avatarFileId,
				isActive: sheet.isActive,
				createdAt: sheet.createdAt,
				updatedAt: sheet.updatedAt,
				properties,
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Composite([
					t.Object({ success: t.Literal(true) }),
					CharacterSheetDetailSchema,
				]),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["CharacterSheets"],
				summary: "Détail complet d'une fiche de personnage",
			},
		},
	)

	/**
	 * PATCH /character-sheets/:id/values - Auto-save des valeurs.
	 *
	 * Upsert d'un lot de valeurs. Chaque propertyId doit appartenir au système
	 * de la fiche (sinon 400). Réservé au propriétaire. Renvoie les valeurs
	 * mises à jour.
	 */
	.patch(
		"/:id/values",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const sheet = await prisma.characterSheet.findUnique({
				where: { id: params.id },
				select: {
					id: true,
					userId: true,
					gameSystemId: true,
					deletedAt: true,
				},
			});
			if (!sheet || sheet.deletedAt) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}
			if (sheet.userId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			// Les propriétés doivent appartenir au système de la fiche.
			const allowed = await prisma.gameSystemProperty.findMany({
				where: { gameSystemId: sheet.gameSystemId },
				select: { propertyId: true },
			});
			const allowedIds = new Set(allowed.map((a) => a.propertyId));
			const invalid = body.filter((v) => !allowedIds.has(v.propertyId));
			if (invalid.length > 0) {
				set.status = 400;
				return {
					success: false as const,
					error:
						"Une ou plusieurs propriétés n'appartiennent pas au système de la fiche",
				};
			}

			await prisma.$transaction(
				body.map((v) =>
					prisma.characterSheetValue.upsert({
						where: {
							characterSheetId_propertyId: {
								characterSheetId: sheet.id,
								propertyId: v.propertyId,
							},
						},
						create: {
							id: newId(),
							characterSheetId: sheet.id,
							propertyId: v.propertyId,
							value: v.value ?? {},
						},
						update: { value: v.value ?? {} },
					}),
				),
			);

			return {
				success: true as const,
				values: body.map((v) => ({
					propertyId: v.propertyId,
					value: v.value,
				})),
			};
		},
		{
			params: t.Object({ id: t.String() }),
			body: UpdateValuesBody,
			response: {
				200: t.Object({
					success: t.Literal(true),
					values: t.Array(
						t.Object({ propertyId: t.String(), value: t.Unknown() }),
					),
				}),
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["CharacterSheets"],
				summary: "Auto-save des valeurs d'une fiche de personnage",
			},
		},
	);
