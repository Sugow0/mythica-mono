/** DTO et validation pour la modification du profil (pseudo, bio) */
import { type Static, t } from "elysia";
import { ErrorResponse, MeUserSchema } from "../../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const UpdateProfileBodySchema = t.Object({
	pseudo: t.Optional(
		t.String({
			minLength: 3,
			maxLength: 50,
			description: "Nouveau pseudo (unique, 3 à 50 caractères)",
		}),
	),
	bio: t.Optional(
		t.Nullable(
			t.String({
				maxLength: 500,
				description: "Biographie (max 500 caractères, null pour effacer)",
			}),
		),
	),
});

export type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>;

// ==================== SCHÉMAS ROUTE ====================

export const updateProfileRouteSchema = {
	body: UpdateProfileBodySchema,
	response: {
		200: t.Object({ success: t.Literal(true), user: MeUserSchema }),
		400: ErrorResponse,
		401: ErrorResponse,
	},
	detail: {
		tags: ["Identity"],
		summary: "Modifier mon profil",
		description: "Met à jour le pseudo et/ou la bio de l'utilisateur connecté",
	},
};
