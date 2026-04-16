/** Soit userId (session), soit email en body pour redemander un email de vérification. */
export type ResendVerificationCommand = {
	userId?: string;
	email?: string;
};
