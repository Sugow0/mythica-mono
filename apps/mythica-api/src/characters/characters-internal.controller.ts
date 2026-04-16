import { Elysia, type Static, t as T, t } from "elysia";
import { prisma } from "../lib/prisma";
import {
	CharacterListResponse,
	CharacterTypeEnum,
	ErrorResponse,
	PaginationQuery,
	PublicCharacterSchema,
} from "../lib/schemas";
import { validateServiceKey } from "../lib/service-auth";
import {
	minimalCharacterSelect,
	publicCharacterSelect,
} from "./public-character.select";

const InternalListCharactersQuerySchema = T.Composite([
	PaginationQuery,
	T.Object({
		campaignId: T.Optional(T.String({ description: "Filtrer par campagne" })),
		userId: T.Optional(T.String({ description: "Filtrer par joueur" })),
		type: T.Optional(CharacterTypeEnum),
		isActive: T.Optional(
			T.BooleanString({ description: "Filtrer par statut actif" }),
		),
	}),
]);

type InternalListCharactersQuery = Static<
	typeof InternalListCharactersQuerySchema
>;

const UpdateDataBodySchema = T.Object({
	data: T.Record(T.String(), T.Unknown(), {
		description: "Données complètes de la fiche (JSONB)",
	}),
});

export const charactersInternalController = new Elysia({ prefix: "/internal" })
	// ==================== QUERIES ====================

	/** GET /internal/characters - Liste complète avec filtres pour le MJ IA */
	.get(
		"/characters",
		async ({ set, request, query }) => {
			if (!validateServiceKey(request)) {
				set.status = 401;
				return { success: false as const, error: "Clé de service invalide" };
			}

			const {
				page = 1,
				limit = 20,
				campaignId,
				userId,
				type,
				isActive,
			} = query as InternalListCharactersQuery;

			const skip = (page - 1) * limit;
			const where = {
				...(campaignId !== undefined && { campaignId }),
				...(userId !== undefined && { userId }),
				...(type !== undefined && { type }),
				...(isActive !== undefined && { isActive }),
			};

			const [characters, total] = await Promise.all([
				prisma.characters.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					select: minimalCharacterSelect,
				}),
				prisma.characters.count({ where }),
			]);

			return {
				success: true as const,
				characters,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		},
		{
			query: InternalListCharactersQuerySchema,
			response: {
				200: CharacterListResponse,
				401: ErrorResponse,
			},
			detail: {
				tags: ["Internal"],
				summary: "[Interne] Liste des fiches de personnage",
				description:
					"Endpoint réservé au MJ IA. Liste les fiches avec filtres avancés.",
			},
		},
	)

	/** GET /internal/characters/:id - Détail complet avec data JSONB */
	.get(
		"/characters/:id",
		async ({ set, request, params }) => {
			if (!validateServiceKey(request)) {
				set.status = 401;
				return { success: false as const, error: "Clé de service invalide" };
			}

			const character = await prisma.characters.findUnique({
				where: { id: params.id },
				select: publicCharacterSelect,
			});

			if (!character) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}

			return { success: true as const, character };
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
					character: PublicCharacterSchema,
				}),
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Internal"],
				summary: "[Interne] Détail d'une fiche de personnage",
				description:
					"Endpoint réservé au MJ IA. Retourne la fiche complète avec toutes ses données JSONB.",
			},
		},
	)

	/** PATCH /internal/characters/:id/data - Mise à jour JSONB par le MJ IA */
	.patch(
		"/characters/:id/data",
		async ({ set, request, params, body }) => {
			if (!validateServiceKey(request)) {
				set.status = 401;
				return { success: false as const, error: "Clé de service invalide" };
			}

			// Pour l'API interne, on utilise un userId fictif (service) — pas de contrôle propriétaire
			const character = await prisma.characters.findUnique({
				where: { id: params.id },
				select: { id: true },
			});

			if (!character) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}

			await prisma.characters.update({
				where: { id: params.id },
				data: { data: (body as { data: Record<string, unknown> }).data },
			});

			return {
				success: true as const,
				message: "Données de la fiche mises à jour",
			};
		},
		{
			body: UpdateDataBodySchema,
			response: {
				200: t.Object({
					success: t.Literal(true),
					message: t.String(),
				}),
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Internal"],
				summary: "[Interne] Mettre à jour les données JSONB d'une fiche",
				description:
					"Endpoint réservé au MJ IA. Remplace intégralement le champ data de la fiche.",
			},
		},
	);
