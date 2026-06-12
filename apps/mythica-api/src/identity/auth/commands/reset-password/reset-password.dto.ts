import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../../lib/schemas";

export const ResetPasswordBodySchema = t.Object({
	token: t.String({ minLength: 1, description: "Token reçu par email" }),
	newPassword: t.String({
		minLength: 8,
		maxLength: 128,
		description: "Nouveau mot de passe (8 caractères minimum)",
	}),
});

export type ResetPasswordBody = Static<typeof ResetPasswordBodySchema>;

export const resetPasswordRouteSchema = {
	body: ResetPasswordBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
	},
	detail: {
		tags: ["Identity"],
		summary: "Réinitialiser le mot de passe",
		description: "Définit un nouveau mot de passe à partir d'un token valide.",
	},
};
