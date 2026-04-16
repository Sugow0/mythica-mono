/** DTO et validation pour la modification d'une campagne */
import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../lib/schemas";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

// ==================== SCHÉMA REQUEST ====================

export const UpdateCampaignBodySchema = t.Object({
	name: t.Optional(
		t.String({
			minLength: NAME_MIN_LENGTH,
			maxLength: NAME_MAX_LENGTH,
			description: `Nom de la campagne (${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} caractères)`,
		}),
	),
	description: t.Optional(
		t.String({
			maxLength: DESCRIPTION_MAX_LENGTH,
			description: `Description de la campagne (max ${DESCRIPTION_MAX_LENGTH} caractères)`,
		}),
	),
	visibility: t.Optional(
		t.Union([t.Literal("PUBLIC"), t.Literal("PRIVATE")], {
			description: "Visibilité de la campagne",
		}),
	),
	status: t.Optional(
		t.Union([t.Literal("DRAFT"), t.Literal("ACTIVE")], {
			description: "Statut de la campagne",
		}),
	),
	gameSystemId: t.Optional(
		t.String({
			description: "ID du système de jeu associé à la campagne",
		}),
	),
});

export type UpdateCampaignBody = Static<typeof UpdateCampaignBodySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const updateCampaignRouteSchema = {
	body: UpdateCampaignBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Modifier une campagne",
		description: "Modifie les informations d'une campagne existante",
	},
};
