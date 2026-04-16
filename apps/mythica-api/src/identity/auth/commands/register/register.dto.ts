/** DTO et validation pour l'inscription */
import { type Static, t } from "elysia";
import { ErrorResponse, PublicUserSchema } from "../../../../lib/schemas";

export const PASSWORD_MIN_LENGTH = 6;

// ==================== SCHÉMA REQUEST ====================

export const RegisterBodySchema = t.Object({
	email: t.String({ format: "email", description: "Adresse email valide" }),
	password: t.String({
		minLength: PASSWORD_MIN_LENGTH,
		description: `Mot de passe (min. ${PASSWORD_MIN_LENGTH} caractères)`,
	}),
	firstName: t.String({ minLength: 1, description: "Prénom" }),
	lastName: t.String({ minLength: 1, description: "Nom" }),
	pseudo: t.String({ minLength: 1, description: "Pseudo" }),
});

export type RegisterBody = Static<typeof RegisterBodySchema>;

// ==================== SCHÉMA RESPONSE ====================

export const RegisterResponse = t.Object({
	success: t.Literal(true),
	user: PublicUserSchema,
	message: t.String({ description: "Message de confirmation" }),
});

export type RegisterResponseType = Static<typeof RegisterResponse>;

// ==================== SCHÉMAS ROUTE ====================

export const registerRouteSchema = {
	body: RegisterBodySchema,
	response: {
		201: RegisterResponse,
		400: ErrorResponse,
		409: ErrorResponse, // Email déjà utilisé
	},
	detail: {
		tags: ["Identity"],
		summary: "Inscription",
		description: "Crée un nouveau compte utilisateur",
	},
};
