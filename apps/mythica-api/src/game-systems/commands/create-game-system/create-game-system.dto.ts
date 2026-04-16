import { type Static, t } from "elysia";
import { ErrorResponse } from "../../../lib/schemas";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

export const CreateGameSystemBodySchema = t.Object({
	name: t.String({
		minLength: NAME_MIN_LENGTH,
		maxLength: NAME_MAX_LENGTH,
		description: `Nom du système de jeu (${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} caractères)`,
	}),
	description: t.Optional(
		t.String({
			maxLength: DESCRIPTION_MAX_LENGTH,
			description: `Description du système de jeu (max ${DESCRIPTION_MAX_LENGTH} caractères)`,
		}),
	),
});

export type CreateGameSystemBody = Static<typeof CreateGameSystemBodySchema>;

export const CreateGameSystemResponse = t.Object({
	success: t.Literal(true),
	gameSystemId: t.String({ description: "ID du système de jeu créé" }),
});

export const createGameSystemRouteSchema = {
	body: CreateGameSystemBodySchema,
	response: {
		201: CreateGameSystemResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
	},
	detail: {
		tags: ["GameSystems"],
		summary: "Créer un système de jeu",
		description: "Crée un nouveau système de jeu (admin uniquement)",
	},
};
