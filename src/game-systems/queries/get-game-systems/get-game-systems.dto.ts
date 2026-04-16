import type { Static } from "elysia";
import { t } from "elysia";
import {
	ErrorResponse,
	GameSystemSchema,
	PaginationMeta,
	PaginationQuery,
} from "../../../lib/schemas";

export const GetGameSystemsQuerySchema = PaginationQuery;

export type GetGameSystemsQuery = Static<typeof GetGameSystemsQuerySchema>;

export const GameSystemListResponse = t.Object({
	success: t.Literal(true),
	gameSystems: t.Array(GameSystemSchema),
	pagination: PaginationMeta,
});

export const getGameSystemsRouteSchema = {
	query: GetGameSystemsQuerySchema,
	response: {
		200: GameSystemListResponse,
		400: ErrorResponse,
	},
	detail: {
		tags: ["GameSystems"],
		summary: "Liste des systèmes de jeu",
		description: "Récupère la liste paginée des systèmes de jeu",
	},
};
