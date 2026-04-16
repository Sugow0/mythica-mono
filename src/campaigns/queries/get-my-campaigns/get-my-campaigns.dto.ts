/** DTO et validation pour la query mes campagnes (pagination) */
import type { Static } from "elysia";
import {
	CampaignListResponse,
	ErrorResponse,
	PaginationQuery,
} from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const GetMyCampaignsQuerySchema = PaginationQuery;

export type GetMyCampaignsQuery = Static<typeof GetMyCampaignsQuerySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const getMyCampaignsRouteSchema = {
	query: GetMyCampaignsQuerySchema,
	response: {
		200: CampaignListResponse,
		400: ErrorResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Liste de mes campagnes",
		description:
			"Récupère la liste paginée des campagnes de l'utilisateur connecté",
	},
};
