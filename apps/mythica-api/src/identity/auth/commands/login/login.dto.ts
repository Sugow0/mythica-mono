/** DTO et validation pour la connexion */
import { type Static, t } from "elysia";
import { ErrorResponse } from "../../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const LoginBodySchema = t.Object({
	email: t.String({ format: "email", description: "Adresse email" }),
	password: t.String({ minLength: 1, description: "Mot de passe" }),
});

export type LoginBody = Static<typeof LoginBodySchema>;

// ==================== SCHÉMAS RESPONSE ====================

/** Réponse de connexion réussie */
export const LoginSuccessResponse = t.Object({
	success: t.Literal(true),
	message: t.String({ description: "Message de confirmation" }),
});

/** Réponse demandant la 2FA */
export const Login2FARequiredResponse = t.Object({
	success: t.Literal(true),
	requiresTwoFactor: t.Literal(true),
	tempToken: t.String({ description: "Token temporaire pour la 2FA" }),
});

// ==================== SCHÉMAS ROUTE ====================

export const loginRouteSchema = {
	body: LoginBodySchema,
	response: {
		200: t.Union([LoginSuccessResponse, Login2FARequiredResponse]),
		400: ErrorResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Identity"],
		summary: "Connexion",
		description: "Authentifie un utilisateur avec email et mot de passe",
	},
};
