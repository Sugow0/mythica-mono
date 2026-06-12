import { type Static, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../../../lib/schemas";

export const ForgotPasswordBodySchema = t.Object({
	email: t.String({ format: "email", description: "Adresse email du compte" }),
});

export type ForgotPasswordBody = Static<typeof ForgotPasswordBodySchema>;

export const forgotPasswordRouteSchema = {
	body: ForgotPasswordBodySchema,
	response: {
		200: SuccessMessageResponse,
		400: ErrorResponse,
	},
	detail: {
		tags: ["Identity"],
		summary: "Demander une réinitialisation de mot de passe",
		description:
			"Envoie un email de réinitialisation si un compte existe (réponse identique sinon, anti-énumération).",
	},
};
