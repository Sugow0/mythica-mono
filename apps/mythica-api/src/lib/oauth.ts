import * as arctic from "arctic";

const getBaseUrl = () => {
	const base =
		process.env.API_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3200";
	return base.replace(/\/$/, "");
};

/** Redirect URI pour les callbacks OAuth (ex: http://localhost:3200/identity/oauth/google/callback) */
export function getOAuthRedirectUri(
	provider: "google" | "discord" | "apple",
): string {
	return `${getBaseUrl()}/identity/oauth/${provider}/callback`;
}

// --- Google (PKCE requis)
export function createGoogleOAuth() {
	const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;
	return new arctic.Google(
		clientId,
		clientSecret,
		getOAuthRedirectUri("google"),
	);
}

// --- Discord (confidential client, pas de PKCE obligatoire)
export function createDiscordOAuth() {
	const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
	const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;
	return new arctic.Discord(
		clientId,
		clientSecret,
		getOAuthRedirectUri("discord"),
	);
}

// --- Apple (clé privée PKCS#8)
function getApplePrivateKey(): Uint8Array | null {
	const key = process.env.APPLE_OAUTH_PRIVATE_KEY;
	if (!key) return null;
	// Support PEM inline (avec \n) ou base64 seul
	const pem = key.replace(/\\n/g, "\n");
	const base64 = pem
		.replace(/-----BEGIN PRIVATE KEY-----/, "")
		.replace(/-----END PRIVATE KEY-----/, "")
		.replace(/\s/g, "")
		.trim();
	try {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	} catch {
		return null;
	}
}

export function createAppleOAuth() {
	const clientId = process.env.APPLE_OAUTH_CLIENT_ID; // Service ID
	const teamId = process.env.APPLE_OAUTH_TEAM_ID;
	const keyId = process.env.APPLE_OAUTH_KEY_ID;
	const privateKey = getApplePrivateKey();
	if (!clientId || !teamId || !keyId || !privateKey) return null;
	return new arctic.Apple(
		clientId,
		teamId,
		keyId,
		privateKey,
		getOAuthRedirectUri("apple"),
	);
}

export type OAuthProviderId = "google" | "discord" | "apple";

export const OAUTH_SCOPES = {
	google: ["openid", "profile", "email"] as const,
	discord: ["identify", "email"] as const,
	apple: ["name", "email"] as const,
} satisfies Record<OAuthProviderId, readonly string[]>;

export { arctic };
