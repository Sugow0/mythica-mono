/** DTO et validation pour la query liste des campagnes (pagination) */
import type { Static } from "elysia";
import {
	CampaignListResponse,
	ErrorResponse,
	PaginationQuery,
} from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const GetCampaignsQuerySchema = PaginationQuery;

export type GetCampaignsQuery = Static<typeof GetCampaignsQuerySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const getCampaignsRouteSchema = {
	query: GetCampaignsQuerySchema,
	response: {
		200: CampaignListResponse,
		400: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Liste des campagnes publiques",
		description: "Récupère la liste paginée des campagnes publiques",
	},
};
