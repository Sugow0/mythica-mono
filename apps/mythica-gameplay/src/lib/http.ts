import { t } from "elysia";

/** Réponse d'erreur normalisée. */
export const ErrorResponse = t.Object({
	success: t.Literal(false),
	error: t.String(),
});

/** Réponse de succès simple (mutation sans corps de retour utile). */
export const SuccessMessageResponse = t.Object({
	success: t.Literal(true),
	message: t.String(),
});
