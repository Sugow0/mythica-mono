/** DTO et validation pour la recherche de campagnes */
import { type Static, t } from "elysia";
import {
	CampaignListResponse,
	ErrorResponse,
	PAGINATION,
} from "../../../lib/schemas";

const MIN_SEARCH_LENGTH = 2;

// ==================== SCHÉMA REQUEST ====================

export const SearchCampaignsQuerySchema = t.Object({
	search: t.String({
		minLength: MIN_SEARCH_LENGTH,
		description: `Terme de recherche (min. ${MIN_SEARCH_LENGTH} caractères)`,
	}),
	page: t.Optional(
		t.Numeric({
			minimum: 1,
			default: PAGINATION.DEFAULT_PAGE,
			description: "Numéro de page",
		}),
	),
	limit: t.Optional(
		t.Numeric({
			minimum: 1,
			maximum: PAGINATION.MAX_LIMIT,
			default: PAGINATION.DEFAULT_LIMIT,
			description: "Nombre d'éléments par page",
		}),
	),
});

export type SearchCampaignsQuery = Static<typeof SearchCampaignsQuerySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const searchCampaignsRouteSchema = {
	query: SearchCampaignsQuerySchema,
	response: {
		200: CampaignListResponse,
		400: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Rechercher des campagnes",
		description: "Recherche des campagnes publiques par nom ou description",
	},
};
