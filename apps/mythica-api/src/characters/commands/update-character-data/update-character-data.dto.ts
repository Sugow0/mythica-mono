/** DTO et validation pour la mise à jour du JSONB data d'une fiche */
import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const UpdateCharacterDataBodySchema = t.Object({
	data: t.Record(t.String(), t.Unknown(), {
		description: "Données complètes de la fiche (JSONB — remplacement total)",
	}),
});

export type UpdateCharacterDataBody = Static<
	typeof UpdateCharacterDataBodySchema
>;

// ==================== SCHÉMAS ROUTE ====================

export const updateCharacterDataRouteSchema = {
	body: UpdateCharacterDataBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["Characters"],
		summary: "Remplacer les données JSONB d'une fiche",
		description:
			"Remplace intégralement le champ data (JSONB) de la fiche de personnage",
	},
};
