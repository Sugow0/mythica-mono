/** DTO et validation pour la création d'une session */
import { type Static, t } from "elysia";
import { ErrorResponse } from "../../../lib/schemas";

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const MIN_DURATION = 15; // minutes
const MAX_DURATION = 720; // 12 heures

// ==================== SCHÉMA REQUEST ====================

export const CreateSessionBodySchema = t.Object({
	title: t.String({
		minLength: TITLE_MIN_LENGTH,
		maxLength: TITLE_MAX_LENGTH,
		description: `Titre de la session (${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} caractères)`,
	}),
	description: t.Optional(
		t.String({
			maxLength: DESCRIPTION_MAX_LENGTH,
			description: `Description de la session (max ${DESCRIPTION_MAX_LENGTH} caractères)`,
		}),
	),
	scheduledAt: t.String({
		format: "date-time",
		description:
			"Date et heure de la session (ISO 8601, doit être dans le futur)",
	}),
	duration: t.Number({
		minimum: MIN_DURATION,
		maximum: MAX_DURATION,
		description: `Durée en minutes (${MIN_DURATION}-${MAX_DURATION})`,
	}),
});

export type CreateSessionBody = Static<typeof CreateSessionBodySchema>;

// ==================== SCHÉMA RESPONSE ====================

export const CreateSessionResponse = t.Object({
	success: t.Literal(true),
	sessionId: t.String({ description: "ID de la session créée" }),
});

export type CreateSessionResponseType = Static<typeof CreateSessionResponse>;

// ==================== SCHÉMAS ROUTE ====================

export const createSessionRouteSchema = {
	body: CreateSessionBodySchema,
	response: {
		201: CreateSessionResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Créer une session",
		description: "Crée une nouvelle session de jeu pour une campagne",
	},
};
