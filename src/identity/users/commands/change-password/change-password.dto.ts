/** DTO et validation pour le changement de mot de passe */
import { type Static, t } from "elysia";
import {
	ErrorResponse,
	PASSWORD_MIN_LENGTH,
	SuccessMessageResponse,
} from "../../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const ChangePasswordBodySchema = t.Object({
	currentPassword: t.String({
		minLength: 1,
		description: "Mot de passe actuel",
	}),
	newPassword: t.String({
		minLength: PASSWORD_MIN_LENGTH,
		description: `Nouveau mot de passe (min. ${PASSWORD_MIN_LENGTH} caractères)`,
	}),
});

export type ChangePasswordBody = Static<typeof ChangePasswordBodySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const changePasswordRouteSchema = {
	body: ChangePasswordBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Identity"],
		summary: "Changer de mot de passe",
		description: "Change le mot de passe de l'utilisateur connecté",
	},
};
