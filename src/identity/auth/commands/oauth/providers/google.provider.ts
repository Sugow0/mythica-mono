import type * as arctic from "arctic";
import type { OAuthProfile } from "../oauth.types";

export async function getGoogleProfile(
	tokens: arctic.OAuth2Tokens<unknown>,
): Promise<OAuthProfile | null> {
	const accessToken = tokens.accessToken();
	const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) return null;
	const data = (await res.json()) as {
		sub: string;
		email?: string;
		given_name?: string;
		family_name?: string;
		name?: string;
	};
	const firstName = data.given_name ?? data.name?.split(" ")[0] ?? "";
	const lastName =
		data.family_name ?? data.name?.split(" ").slice(1).join(" ") ?? "";
	const email = data.email ?? "";
	const pseudo = data.email?.split("@")[0] ?? data.sub ?? "user";
	return {
		providerUserId: data.sub,
		email,
		firstName,
		lastName,
		pseudo: pseudo.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) || "user",
	};
}
