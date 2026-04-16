/** DTO et validation pour la query campagnes archivées (pagination) */
import type { Static } from "elysia";
import {
	CampaignListResponse,
	ErrorResponse,
	PaginationQuery,
} from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const GetArchivedCampaignsQuerySchema = PaginationQuery;

export type GetArchivedCampaignsQuery = Static<
	typeof GetArchivedCampaignsQuerySchema
>;

// ==================== SCHÉMAS ROUTE ====================

export const getArchivedCampaignsRouteSchema = {
	query: GetArchivedCampaignsQuerySchema,
	response: {
		200: CampaignListResponse,
		400: ErrorResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Liste des campagnes archivées",
		description:
			"Récupère la liste paginée des campagnes archivées de l'utilisateur",
	},
};
