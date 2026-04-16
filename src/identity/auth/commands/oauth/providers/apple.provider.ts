import * as arctic from "arctic";
import type { OAuthProfile } from "../oauth.types";

/** Données user envoyées par Apple en form_post (première connexion uniquement) */
export type AppleUserPayload = {
	name?: { firstName?: string; lastName?: string };
	email?: string;
};

export function getAppleProfileFromIdToken(
	tokens: arctic.OAuth2Tokens<unknown>,
	userPayload?: AppleUserPayload | null,
): OAuthProfile | null {
	let idToken: string;
	try {
		idToken = tokens.idToken();
	} catch {
		return null;
	}
	const claims = arctic.decodeIdToken(idToken);
	const sub = claims.sub as string | undefined;
	if (!sub) return null;
	const email = (userPayload?.email ?? (claims.email as string) ?? "").trim();
	const firstName =
		userPayload?.name?.firstName ?? (claims.given_name as string) ?? "";
	const lastName =
		userPayload?.name?.lastName ?? (claims.family_name as string) ?? "";
	const pseudo = email
		? email
				.split("@")[0]
				.replace(/[^a-zA-Z0-9_-]/g, "_")
				.slice(0, 30)
		: "user";
	return {
		providerUserId: sub,
		email: email || `${sub}@privaterelay.appleid.com`,
		firstName,
		lastName,
		pseudo: pseudo || "user",
	};
}
