import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../lib/schemas";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

export const UpdateGameSystemBodySchema = t.Object({
	name: t.Optional(
		t.String({
			minLength: NAME_MIN_LENGTH,
			maxLength: NAME_MAX_LENGTH,
			description: `Nom du système de jeu (${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} caractères)`,
		}),
	),
	description: t.Optional(
		t.String({
			maxLength: DESCRIPTION_MAX_LENGTH,
			description: `Description du système de jeu (max ${DESCRIPTION_MAX_LENGTH} caractères)`,
		}),
	),
});

export type UpdateGameSystemBody = Static<typeof UpdateGameSystemBodySchema>;

export const updateGameSystemRouteSchema = {
	body: UpdateGameSystemBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["GameSystems"],
		summary: "Modifier un système de jeu",
		description: "Modifie un système de jeu existant (admin uniquement)",
	},
};
