/** DTO et validation pour le changement d'email */
import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const ChangeEmailBodySchema = t.Object({
	newEmail: t.String({
		format: "email",
		description: "Nouvelle adresse email",
	}),
	code: t.String({
		pattern: "^\\d{6}$",
		description: "Code 2FA (6 chiffres)",
	}),
});

export type ChangeEmailBody = Static<typeof ChangeEmailBodySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const changeEmailRouteSchema = {
	body: ChangeEmailBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse, // 2FA requis
	},
	detail: {
		tags: ["Identity"],
		summary: "Changer d'email",
		description:
			"Change l'adresse email de l'utilisateur connecté (2FA requis)",
	},
};
