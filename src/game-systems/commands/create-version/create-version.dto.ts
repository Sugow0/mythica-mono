import { type Static, t } from "elysia";
import { ErrorResponse } from "../../../lib/schemas";

const VERSION_MIN_LENGTH = 1;
const VERSION_MAX_LENGTH = 50;

export const CreateVersionBodySchema = t.Object({
	version: t.String({
		minLength: VERSION_MIN_LENGTH,
		maxLength: VERSION_MAX_LENGTH,
		description: `Numéro de version (${VERSION_MIN_LENGTH}-${VERSION_MAX_LENGTH} caractères)`,
	}),
});

export type CreateVersionBody = Static<typeof CreateVersionBodySchema>;

export const CreateVersionResponse = t.Object({
	success: t.Literal(true),
	versionId: t.String({ description: "ID de la version créée" }),
});

export const createVersionRouteSchema = {
	body: CreateVersionBodySchema,
	response: {
		201: CreateVersionResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["GameSystems"],
		summary: "Ajouter une version",
		description:
			"Ajoute une nouvelle version à un système de jeu (admin uniquement)",
	},
};
