/** DTO et validation pour la création d'une campagne */
import { type Static, t } from "elysia";
import { ErrorResponse } from "../../../lib/schemas";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

// ==================== SCHÉMA REQUEST ====================

export const CreateCampaignBodySchema = t.Object({
	name: t.String({
		minLength: NAME_MIN_LENGTH,
		maxLength: NAME_MAX_LENGTH,
		description: `Nom de la campagne (${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} caractères)`,
	}),
	description: t.Optional(
		t.String({
			maxLength: DESCRIPTION_MAX_LENGTH,
			description: `Description de la campagne (max ${DESCRIPTION_MAX_LENGTH} caractères)`,
		}),
	),
	visibility: t.Optional(
		t.Union([t.Literal("PUBLIC"), t.Literal("PRIVATE")], {
			default: "PRIVATE",
			description: "Visibilité de la campagne",
		}),
	),
	gameSystemId: t.String({
		description: "ID du système de jeu associé à la campagne",
	}),
});

export type CreateCampaignBody = Static<typeof CreateCampaignBodySchema>;

// ==================== SCHÉMA RESPONSE ====================

export const CreateCampaignResponse = t.Object({
	success: t.Literal(true),
	campaignId: t.String({ description: "ID de la campagne créée" }),
});

export type CreateCampaignResponseType = Static<typeof CreateCampaignResponse>;

// ==================== SCHÉMAS ROUTE ====================

export const createCampaignRouteSchema = {
	body: CreateCampaignBodySchema,
	response: {
		201: CreateCampaignResponse,
		400: ErrorResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Créer une campagne",
		description:
			"Crée une nouvelle campagne dont l'utilisateur sera le créateur",
	},
};
