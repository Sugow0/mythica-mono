import {
	applyAbilityBonuses,
	validateAllocation,
} from "@mythica/character-engine";
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

/**
 * Corps de finalisation du build (résultat du wizard). Générique : référence le
 * contenu par `slug` (collections du système), pas de notion D&D en dur.
 */
const BuildBody = t.Object({
	raceSlug: t.String(),
	classes: t.Array(
		t.Object({
			slug: t.String(),
			level: t.Integer({ minimum: 1, maximum: 20 }),
			isPrimary: t.Optional(t.Boolean()),
		}),
		{ minItems: 1, maxItems: 3 },
	),
	/** Sous-classes choisies, rattachées à leur classe. */
	subclasses: t.Optional(
		t.Array(t.Object({ classSlug: t.String(), slug: t.String() })),
	),
	backgroundSlug: t.String(),
	abilityMethod: t.Union([
		t.Literal("standard_array"),
		t.Literal("point_buy"),
		t.Literal("dice_roll"),
		t.Literal("manual"),
	]),
	/** Scores de base choisis (avant bonus raciaux), indexés par clé de carac. */
	abilityScores: t.Record(t.String(), t.Integer()),
	skillProficiencies: t.Optional(t.Array(t.String())),
	/** Sorts choisis, rattachés à leur classe et à leur rôle (multiclassage). */
	spells: t.Optional(
		t.Array(
			t.Object({
				slug: t.String(),
				classSlug: t.String(),
				role: t.Union([
					t.Literal("cantrip"),
					t.Literal("spell"),
					t.Literal("book"),
				]),
			}),
		),
	),
	inventory: t.Optional(
		t.Array(t.Object({ slug: t.String(), qty: t.Integer({ minimum: 1 }) })),
	),
	gold: t.Optional(t.Integer({ minimum: 0 })),
	/** Champs de lore (clé de propriété textarea -> texte). */
	lore: t.Optional(t.Record(t.String(), t.String())),
});

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
					// Garantit la présence du miroir utilisateur (alimenté en temps
					// normal par l'event sync) : évite une violation de clé étrangère
					// si l'event n'a pas encore été consommé pour cet utilisateur.
					await tx.user.upsert({
						where: { id: currentUser.id },
						create: { id: currentUser.id },
						update: {},
					});

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
	)

	/**
	 * POST /character-sheets/:id/build - Finaliser le build (résultat du wizard).
	 *
	 * Générique et data-driven : valide la répartition des caractéristiques
	 * (méthode + config de l'étape `pointAllocation`) et les prérequis de
	 * multiclassage via les **données** du contenu, persiste les sélections
	 * (race, classes, background, sorts, inventaire) dans `CharacterSheetSelection`
	 * et **projette** les valeurs directes (caracs finales, maîtrises, niveau,
	 * vitesse, lore) dans `CharacterSheetValue`. Les valeurs dérivées (PV,
	 * emplacements de sorts) restent calculées côté client (cf. fiche détail).
	 */
	.post(
		"/:id/build",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const sheet = await prisma.characterSheet.findUnique({
				where: { id: params.id },
				select: { id: true, userId: true, gameSystemId: true, deletedAt: true },
			});
			if (!sheet || sheet.deletedAt) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}
			if (sheet.userId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			// Contenu du système indexé par (collectionKey, slug).
			const content = await prisma.systemContent.findMany({
				where: { gameSystemId: sheet.gameSystemId },
			});
			const byKeySlug = new Map(
				content.map((c) => [`${c.collectionKey}:${c.slug}`, c]),
			);
			const getContent = (collectionKey: string, slug: string) =>
				byKeySlug.get(`${collectionKey}:${slug}`);

			const race = getContent("race", body.raceSlug);
			const background = getContent("background", body.backgroundSlug);
			const classRefs = body.classes.map((c) => ({
				input: c,
				content: getContent("classe", c.slug),
			}));
			if (!race || !background || classRefs.some((c) => !c.content)) {
				set.status = 400;
				return {
					success: false as const,
					error: "Référence de contenu invalide (race, classe ou background)",
				};
			}

			// Validation de la répartition selon la méthode (config data-driven).
			const allocStep = await prisma.gameSystemCreationStep.findFirst({
				where: { gameSystemId: sheet.gameSystemId, kind: "pointAllocation" },
			});
			const alloc = (allocStep?.config ?? {}) as {
				pointBuyPool?: number;
				pointBuyCostTable?: Record<number, number>;
				minScore?: number;
				maxScore?: number;
				standardArray?: number[];
			};
			const allocResult = validateAllocation(
				body.abilityMethod,
				body.abilityScores,
				{
					pointBuy: alloc.pointBuyCostTable
						? {
								pool: alloc.pointBuyPool ?? 0,
								costTable: alloc.pointBuyCostTable,
								min: alloc.minScore ?? 0,
								max: alloc.maxScore ?? 99,
							}
						: undefined,
					standardArray: alloc.standardArray,
				},
			);
			if (!allocResult.valid) {
				set.status = 400;
				return {
					success: false as const,
					error: `Répartition invalide : ${allocResult.errors.join(" ; ")}`,
				};
			}

			// Scores finaux = base + bonus raciaux (données de la race).
			const raceData = race.data as {
				abilityBonuses?: Record<string, number>;
				skillProficiencies?: string[];
				speed?: number;
			};
			const finalScores = applyAbilityBonuses(
				body.abilityScores,
				raceData.abilityBonuses ?? {},
			);

			// Prérequis de multiclassage (données de classe) si plusieurs classes.
			if (body.classes.length > 1) {
				for (const ref of classRefs) {
					const data = ref.content?.data as {
						multiclassPrereq?: Record<string, number>;
					};
					const prereq = data?.multiclassPrereq ?? {};
					const ok = Object.entries(prereq).every(
						([key, min]) => (finalScores[key] ?? 0) >= Number(min),
					);
					if (!ok) {
						set.status = 400;
						return {
							success: false as const,
							error: `Prérequis de multiclassage non respectés pour ${ref.content?.name}`,
						};
					}
				}
			}

			const totalLevel = body.classes.reduce((sum, c) => sum + c.level, 0);

			// Maîtrises accordées (race + background) + choisies par le joueur.
			const bgData = background.data as { skillProficiencies?: string[] };
			const skills = new Set<string>([
				...(raceData.skillProficiencies ?? []),
				...(bgData.skillProficiencies ?? []),
				...(body.skillProficiencies ?? []),
			]);

			// Mapping clé de propriété -> propertyId pour la projection à plat.
			const mappings = await prisma.gameSystemProperty.findMany({
				where: { gameSystemId: sheet.gameSystemId },
				include: { property: { select: { key: true } } },
			});
			const propIdByKey = new Map(
				mappings.map((m) => [m.property.key, m.propertyId]),
			);

			// Valeurs directes (les dérivées restent calculées côté client).
			const valueByKey: Record<string, unknown> = {};
			for (const [key, score] of Object.entries(finalScores)) {
				valueByKey[key] = score;
			}
			for (const skill of skills) valueByKey[skill] = true;
			valueByKey.niveau = totalLevel;
			if (raceData.speed != null) valueByKey.vitesse = raceData.speed;
			for (const [key, text] of Object.entries(body.lore ?? {})) {
				valueByKey[key] = text;
			}

			// Jets de sauvegarde : maîtrises de la classe principale (le
			// multiclassage n'accorde pas de nouvelles maîtrises de sauvegarde).
			const primaryRef =
				classRefs.find((r) => r.input.isPrimary) ?? classRefs[0];
			const primaryData = (primaryRef?.content?.data ?? {}) as {
				savingThrows?: string[];
				toolProficiencies?: string[];
			};
			for (const ab of primaryData.savingThrows ?? []) {
				valueByKey[`sauvegarde_${ab}`] = true;
			}

			// Or de départ → pièces d'or.
			if (body.gold != null) valueByKey.pieces_or = body.gold;

			// Autres maîtrises & langues (race + classe principale + historique).
			const raceExtra = race.data as {
				languages?: string[];
				traits?: { name?: string }[];
			};
			const bgExtra = background.data as {
				toolProficiencies?: string[];
				feature?: { name?: string };
			};
			const langs = raceExtra.languages ?? [];
			const tools = [
				...(primaryData.toolProficiencies ?? []),
				...(bgExtra.toolProficiencies ?? []),
			];
			const profLines: string[] = [];
			if (langs.length) profLines.push(`Langues : ${langs.join(", ")}`);
			if (tools.length) profLines.push(`Outils : ${tools.join(", ")}`);
			if (profLines.length) {
				valueByKey.maitrises_langues = profLines.join("\n");
			}

			// Capacités & traits (traits raciaux + aptitude d'historique +
			// aptitudes de sous-classe obtenues au niveau actuel).
			const feats = [
				...(raceExtra.traits ?? []).map((t) => t.name).filter(Boolean),
				...(bgExtra.feature?.name ? [bgExtra.feature.name] : []),
			];
			for (const sc of body.subclasses ?? []) {
				const item = getContent("sous-classe", sc.slug);
				if (!item) continue;
				const lvl =
					body.classes.find((c) => c.slug === sc.classSlug)?.level ?? 0;
				const data = item.data as {
					features?: { level: number; name: string }[];
				};
				for (const f of data.features ?? []) {
					if (f.level <= lvl) feats.push(`${item.name} : ${f.name}`);
				}
			}
			if (feats.length) valueByKey.capacites_traits = feats.join(", ");

			const valueEntries = Object.entries(valueByKey).filter(([key]) =>
				propIdByKey.has(key),
			);

			await prisma.$transaction(async (tx) => {
				// Build idempotent : on repart des sélections à zéro.
				await tx.characterSheetSelection.deleteMany({
					where: { characterSheetId: sheet.id },
				});

				const selections: {
					id: string;
					characterSheetId: string;
					collectionKey: string;
					contentId: string;
					level?: number;
					isPrimary?: boolean;
					qty?: number;
					extra?: Record<string, unknown>;
				}[] = [
					{
						id: newId(),
						characterSheetId: sheet.id,
						collectionKey: "race",
						contentId: race.id,
					},
					{
						id: newId(),
						characterSheetId: sheet.id,
						collectionKey: "background",
						contentId: background.id,
					},
					...classRefs.map((ref) => ({
						id: newId(),
						characterSheetId: sheet.id,
						collectionKey: "classe",
						// biome-ignore lint/style/noNonNullAssertion: présence garantie par le garde ci-dessus.
						contentId: ref.content!.id,
						level: ref.input.level,
						isPrimary: ref.input.isPrimary ?? false,
					})),
				];
				for (const s of body.spells ?? []) {
					const sp = getContent("sort", s.slug);
					if (sp) {
						selections.push({
							id: newId(),
							characterSheetId: sheet.id,
							collectionKey: "sort",
							contentId: sp.id,
							// classe d'origine + rôle (cantrip / sort / grimoire) en multiclasse.
							extra: { classSlug: s.classSlug, role: s.role },
						});
					}
				}
				for (const sc of body.subclasses ?? []) {
					const item = getContent("sous-classe", sc.slug);
					if (item) {
						selections.push({
							id: newId(),
							characterSheetId: sheet.id,
							collectionKey: "sous-classe",
							contentId: item.id,
							extra: { classSlug: sc.classSlug },
						});
					}
				}
				for (const item of body.inventory ?? []) {
					const eq = getContent("equipement", item.slug);
					if (eq) {
						selections.push({
							id: newId(),
							characterSheetId: sheet.id,
							collectionKey: "equipement",
							contentId: eq.id,
							qty: item.qty,
						});
					}
				}
				await tx.characterSheetSelection.createMany({ data: selections });

				await tx.characterSheet.update({
					where: { id: sheet.id },
					data: { gold: body.gold ?? null, abilityMethod: body.abilityMethod },
				});

				for (const [key, value] of valueEntries) {
					const propertyId = propIdByKey.get(key);
					if (!propertyId) continue;
					await tx.characterSheetValue.upsert({
						where: {
							characterSheetId_propertyId: {
								characterSheetId: sheet.id,
								propertyId,
							},
						},
						create: {
							id: newId(),
							characterSheetId: sheet.id,
							propertyId,
							value: value as object,
						},
						update: { value: value as object },
					});
				}
			});

			return { success: true as const, id: sheet.id };
		},
		{
			params: t.Object({ id: t.String() }),
			body: BuildBody,
			response: {
				200: t.Object({ success: t.Literal(true), id: t.String() }),
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["CharacterSheets"],
				summary: "Finaliser le build d'une fiche (résultat du wizard)",
			},
		},
	);
