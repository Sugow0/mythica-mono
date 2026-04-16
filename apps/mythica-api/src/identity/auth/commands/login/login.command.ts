/** Commande CQRS : connexion email/password */
export type LoginCommand = {
	email: string;
	password: string;
	/** Identifiant pour le rate limit (ex. IP) */
	rateLimitKey: string;
};
