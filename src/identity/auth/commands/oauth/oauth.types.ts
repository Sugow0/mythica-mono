export type OAuthProviderId = "google" | "discord" | "apple";

export type OAuthProfile = {
	providerUserId: string;
	email: string;
	firstName: string;
	lastName: string;
	/** Pseudo par défaut (ex: username Discord ou email prefix) */
	pseudo: string;
};
