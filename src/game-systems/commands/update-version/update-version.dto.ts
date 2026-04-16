import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../lib/schemas";

const VERSION_MIN_LENGTH = 1;
const VERSION_MAX_LENGTH = 50;

export const UpdateVersionBodySchema = t.Object({
	version: t.String({
		minLength: VERSION_MIN_LENGTH,
		maxLength: VERSION_MAX_LENGTH,
		description: `Numéro de version (${VERSION_MIN_LENGTH}-${VERSION_MAX_LENGTH} caractères)`,
	}),
});

export type UpdateVersionBody = Static<typeof UpdateVersionBodySchema>;

export const updateVersionRouteSchema = {
	body: UpdateVersionBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["GameSystems"],
		summary: "Modifier une version",
		description: "Modifie une version d'un système de jeu (admin uniquement)",
	},
};
