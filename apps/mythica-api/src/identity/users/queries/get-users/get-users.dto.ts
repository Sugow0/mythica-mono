/** DTO et validation pour la query liste des utilisateurs (pagination) */
import type { Static } from "elysia";
import {
	ErrorResponse,
	PaginationQuery,
	UserListResponse,
} from "../../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const GetUsersQuerySchema = PaginationQuery;

export type GetUsersQuery = Static<typeof GetUsersQuerySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const getUsersRouteSchema = {
	query: GetUsersQuerySchema,
	response: {
		200: UserListResponse,
		400: ErrorResponse,
	},
	detail: {
		tags: ["Identity"],
		summary: "Liste des utilisateurs",
		description: "Récupère la liste paginée des utilisateurs publics",
	},
};
