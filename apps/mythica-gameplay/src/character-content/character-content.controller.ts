import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { ErrorResponse } from "../lib/http";
import { prisma } from "../lib/prisma";

/**
 * Lecture du contenu et du parcours de création d'un système de jeu, servis
 * comme **données** pour alimenter le wizard générique côté front. Aucune notion
 * D&D n'est codée ici : tout est paramétré par `collectionKey` et `kind`.
 */

/** Une étape du parcours de création (config = JSON propre au kind). */
const CreationStepSchema = t.Object({
	stepKey: t.String(),
	order: t.Integer(),
	kind: t.String(),
	config: t.Unknown(),
	condition: t.Union([t.String(), t.Null()]),
});

/** Une entrée de contenu d'une collection (race, classe, sort...). */
const ContentItemSchema = t.Object({
	id: t.String(),
	collectionKey: t.String(),
	slug: t.String(),
	name: t.String(),
	description: t.Union([t.String(), t.Null()]),
	data: t.Unknown(),
	sortOrder: t.Integer(),
	portraitFileId: t.Union([t.String(), t.Null()]),
});

export const characterContentController = new Elysia({
	prefix: "/game-systems",
})
	.use(authContext)

	/**
	 * GET /game-systems/:id/creation-flow - Parcours de création du système.
	 * Étapes ordonnées (kind + config) rendues génériquement par le front.
	 */
	.get(
		"/:id/creation-flow",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const gameSystem = await prisma.gameSystem.findUnique({
				where: { id: params.id },
				select: { id: true },
			});
			if (!gameSystem) {
				set.status = 404;
				return { success: false as const, error: "Système de jeu introuvable" };
			}

			const steps = await prisma.gameSystemCreationStep.findMany({
				where: { gameSystemId: params.id },
				orderBy: { order: "asc" },
			});

			return {
				success: true as const,
				steps: steps.map((s) => ({
					stepKey: s.stepKey,
					order: s.order,
					kind: s.kind,
					config: s.config,
					condition: s.condition,
				})),
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					steps: t.Array(CreationStepSchema),
				}),
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["CharacterContent"],
				summary: "Parcours de création (data-driven) d'un système",
			},
		},
	)

	/**
	 * GET /game-systems/:id/content/:collectionKey - Contenu d'une collection.
	 * Ex. collectionKey = "race", "classe", "background", "sort", "equipement".
	 * Supporte ?q=<search>, ?limit=<n>, ?offset=<n> pour la recherche paginée.
	 */
	.get(
		"/:id/content/:collectionKey",
		async ({ set, currentUser, params, query }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const limit = Math.min(query.limit ?? 100, 200);
			const offset = query.offset ?? 0;

			const where = {
				gameSystemId: params.id,
				collectionKey: params.collectionKey,
				...(query.q
					? { name: { contains: query.q, mode: "insensitive" as const } }
					: {}),
			};

			const [items, total] = await Promise.all([
				prisma.systemContent.findMany({
					where,
					orderBy: { sortOrder: "asc" },
					take: limit,
					skip: offset,
				}),
				prisma.systemContent.count({ where }),
			]);

			return {
				success: true as const,
				total,
				limit,
				offset,
				items: items.map((c) => ({
					id: c.id,
					collectionKey: c.collectionKey,
					slug: c.slug,
					name: c.name,
					description: c.description,
					data: c.data,
					sortOrder: c.sortOrder,
					portraitFileId: c.portraitFileId,
				})),
			};
		},
		{
			params: t.Object({ id: t.String(), collectionKey: t.String() }),
			query: t.Object({
				q: t.Optional(t.String()),
				limit: t.Optional(t.Numeric()),
				offset: t.Optional(t.Numeric()),
			}),
			detail: {
				tags: ["CharacterContent"],
				summary: "Contenu d'une collection d'un système (avec recherche)",
			},
		},
	);
