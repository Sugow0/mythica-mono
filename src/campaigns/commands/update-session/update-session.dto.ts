/** DTO et validation pour la modification d'une session */
import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../lib/schemas";

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const MIN_DURATION = 15;
const MAX_DURATION = 720;

// ==================== SCHÉMA REQUEST ====================

export const UpdateSessionBodySchema = t.Object({
	title: t.Optional(
		t.String({
			minLength: TITLE_MIN_LENGTH,
			maxLength: TITLE_MAX_LENGTH,
			description: `Titre de la session (${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} caractères)`,
		}),
	),
	description: t.Optional(
		t.String({
			maxLength: DESCRIPTION_MAX_LENGTH,
			description: `Description de la session (max ${DESCRIPTION_MAX_LENGTH} caractères)`,
		}),
	),
	scheduledAt: t.Optional(
		t.String({
			format: "date-time",
			description: "Date et heure de la session (ISO 8601)",
		}),
	),
	duration: t.Optional(
		t.Number({
			minimum: MIN_DURATION,
			maximum: MAX_DURATION,
			description: `Durée en minutes (${MIN_DURATION}-${MAX_DURATION})`,
		}),
	),
});

export type UpdateSessionBody = Static<typeof UpdateSessionBodySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const updateSessionRouteSchema = {
	body: UpdateSessionBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Modifier une session",
		description: "Modifie les informations d'une session existante",
	},
};
