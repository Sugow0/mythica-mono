/** DTO et validation pour la liste des fiches de personnage */
import { type Static, t } from "elysia";
import {
	CharacterListResponse,
	CharacterTypeEnum,
	ErrorResponse,
	PaginationQuery,
} from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const ListCharactersQuerySchema = t.Composite([
	PaginationQuery,
	t.Object({
		campaignId: t.Optional(t.String({ description: "Filtrer par campagne" })),
		type: t.Optional(CharacterTypeEnum),
		isActive: t.Optional(
			t.BooleanString({ description: "Filtrer par statut actif" }),
		),
	}),
]);

export type ListCharactersQuery = Static<typeof ListCharactersQuerySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const listCharactersRouteSchema = {
	query: ListCharactersQuerySchema,
	response: {
		200: CharacterListResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Characters"],
		summary: "Liste mes fiches de personnage",
		description:
			"Récupère les fiches de personnage de l'utilisateur connecté, avec filtres optionnels",
	},
};
