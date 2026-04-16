import type * as arctic from "arctic";
import type { OAuthProfile } from "../oauth.types";

export async function getDiscordProfile(
	tokens: arctic.OAuth2Tokens<unknown>,
): Promise<OAuthProfile | null> {
	const accessToken = tokens.accessToken();
	const res = await fetch("https://discord.com/api/users/@me", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) return null;
	const data = (await res.json()) as {
		id: string;
		username?: string;
		global_name?: string;
		email?: string;
	};
	const pseudo = data.username ?? data.global_name ?? data.id ?? "user";
	const email = data.email ?? "";
	return {
		providerUserId: data.id,
		email,
		firstName: data.global_name ?? data.username ?? "",
		lastName: "",
		pseudo: pseudo.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) || "user",
	};
}
