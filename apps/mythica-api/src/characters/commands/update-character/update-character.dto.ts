/** DTO et validation pour la mise à jour d'une fiche (nom, isActive, campaignId) */
import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const UpdateCharacterBodySchema = t.Object({
	name: t.Optional(
		t.String({
			minLength: 1,
			maxLength: 100,
			description: "Nom du personnage",
		}),
	),
	isActive: t.Optional(t.Boolean({ description: "Statut actif/inactif" })),
	campaignId: t.Optional(
		t.Nullable(
			t.String({ description: "ID de la campagne (null pour détacher)" }),
		),
	),
});

export type UpdateCharacterBody = Static<typeof UpdateCharacterBodySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const updateCharacterRouteSchema = {
	body: UpdateCharacterBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["Characters"],
		summary: "Modifier une fiche de personnage",
		description:
			"Met à jour le nom, le statut actif ou la campagne d'une fiche",
	},
};
