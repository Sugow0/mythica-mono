import * as arctic from "arctic";
import { Elysia, t } from "elysia";
import {
	createAppleOAuth,
	createDiscordOAuth,
	createGoogleOAuth,
	OAUTH_SCOPES,
	type OAuthProviderId,
} from "../../lib/oauth";
import { ErrorResponse, SuccessMessageResponse } from "../../lib/schemas";
import { oauthCallbackHandler } from "./commands/oauth/oauth.handler";
import {
	type AppleUserPayload,
	getAppleProfileFromIdToken,
} from "./commands/oauth/providers/apple.provider";
import { getDiscordProfile } from "./commands/oauth/providers/discord.provider";
import { getGoogleProfile } from "./commands/oauth/providers/google.provider";

const OAUTH_COOKIE_OPTIONS = {
	path: "/",
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	maxAge: 60 * 10, // 10 min
	sameSite: "lax" as const,
};

/** Pour Apple form_post, le cookie state doit être SameSite=None si callback cross-origin */
const OAUTH_STATE_COOKIE_OPTIONS_APPLE = {
	...OAUTH_COOKIE_OPTIONS,
	sameSite: "none" as const,
};

function getCookie(name: string, cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;
	const parts = cookieHeader.split(";").map((p) => p.trim());
	for (const part of parts) {
		const [key, ...v] = part.split("=");
		if (key?.toLowerCase() === name.toLowerCase())
			return v.join("=").replace(/^"|"$/g, "").trim();
	}
	return null;
}

function setCookieHeader(
	name: string,
	value: string,
	options: Record<string, unknown>,
): string {
	const parts = [`${name}=${encodeURIComponent(value)}`];
	if (options.path) parts.push(`Path=${options.path}`);
	if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
	if (options.httpOnly) parts.push("HttpOnly");
	if (options.secure) parts.push("Secure");
	if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
	return parts.join("; ");
}

const PROVIDERS = ["google", "discord", "apple"] as const;

function isOAuthProvider(s: string): s is OAuthProviderId {
	return PROVIDERS.includes(s as OAuthProviderId);
}

/** Front URL pour rediriger après login OAuth (optionnel, sinon 200 + Set-Cookie) */
const getFrontRedirectUrl = () => process.env.OAUTH_FRONT_REDIRECT_URL ?? null;

export const oauthRoutes = new Elysia({ prefix: "/oauth" })
	.get(
		"/:provider",
		async ({ params, set }) => {
			const provider = params.provider?.toLowerCase();
			if (!provider || !isOAuthProvider(provider)) {
				set.status = 400;
				return {
					success: false,
					error: "Provider invalide. Utilisez: google, discord, apple.",
				};
			}

			const state = arctic.generateState();
			const stateCookie = setCookieHeader(
				"oauth_state",
				state,
				OAUTH_COOKIE_OPTIONS,
			);

			if (provider === "google") {
				const google = createGoogleOAuth();
				if (!google) {
					set.status = 503;
					return { success: false, error: "OAuth Google non configuré" };
				}
				const codeVerifier = arctic.generateCodeVerifier();
				const url = google.createAuthorizationURL(state, codeVerifier, [
					...OAUTH_SCOPES.google,
				]);
				url.searchParams.set("access_type", "offline");
				const verifierCookie = setCookieHeader(
					"oauth_code_verifier",
					codeVerifier,
					OAUTH_COOKIE_OPTIONS,
				);
				set.status = 302;
				set.headers.Location = url.toString();
				set.headers["set-cookie"] = [stateCookie, verifierCookie];
				return;
			}

			if (provider === "discord") {
				const discord = createDiscordOAuth();
				if (!discord) {
					set.status = 503;
					return { success: false, error: "OAuth Discord non configuré" };
				}
				const url = discord.createAuthorizationURL(state, null, [
					...OAUTH_SCOPES.discord,
				]);
				set.status = 302;
				set.headers.Location = url.toString();
				set.headers["Set-Cookie"] = stateCookie;
				return;
			}

			if (provider === "apple") {
				const apple = createAppleOAuth();
				if (!apple) {
					set.status = 503;
					return { success: false, error: "OAuth Apple non configuré" };
				}
				const url = apple.createAuthorizationURL(state, [
					...OAUTH_SCOPES.apple,
				]);
				url.searchParams.set("response_mode", "form_post");
				const stateCookieApple = setCookieHeader(
					"oauth_state",
					state,
					OAUTH_STATE_COOKIE_OPTIONS_APPLE,
				);
				set.status = 302;
				set.headers.Location = url.toString();
				set.headers["Set-Cookie"] = stateCookieApple;
				return;
			}

			set.status = 400;
			return { success: false, error: "Provider invalide" };
		},
		{
			params: t.Object({
				provider: t.String({
					description: "Provider OAuth: google, discord, apple",
				}),
			}),
			response: {
				302: t.Void({ description: "Redirection vers le provider OAuth" }),
				400: ErrorResponse,
				503: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Démarrer OAuth",
				description: "Redirige vers le provider OAuth pour authentification",
			},
		},
	)
	.get(
		"/google/callback",
		async ({ query, set, request }) => {
			const code = query.code as string | undefined;
			const state = query.state as string | undefined;
			const cookieHeader = request.headers.get("Cookie") ?? null;
			const storedState = getCookie("oauth_state", cookieHeader);
			const codeVerifier = getCookie("oauth_code_verifier", cookieHeader);

			if (
				!code ||
				!state ||
				!storedState ||
				state !== storedState ||
				!codeVerifier
			) {
				set.status = 400;
				return {
					success: false,
					error: "Requête invalide ou expirée (state/code)",
				};
			}

			const google = createGoogleOAuth();
			if (!google) {
				set.status = 503;
				return { success: false, error: "OAuth Google non configuré" };
			}

			let tokens: arctic.OAuth2Tokens<unknown>;
			try {
				tokens = await google.validateAuthorizationCode(code, codeVerifier);
			} catch (e) {
				if (e instanceof arctic.OAuth2RequestError) {
					set.status = 400;
					return {
						success: false,
						error: "Code d’autorisation invalide ou expiré",
					};
				}
				set.status = 502;
				return { success: false, error: "Erreur OAuth" };
			}

			const profile = await getGoogleProfile(tokens);
			if (!profile) {
				set.status = 502;
				return {
					success: false,
					error: "Impossible de récupérer le profil Google",
				};
			}

			const result = await oauthCallbackHandler("google", profile);
			if (!result.success) {
				set.status = 400;
				return { success: false, error: result.error };
			}

			const frontUrl = getFrontRedirectUrl();
			if (frontUrl) {
				set.status = 302;
				set.headers.Location = frontUrl;
				set.headers["Set-Cookie"] = result.setCookieHeader;
				return;
			}
			set.status = 200;
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true, message: "Connecté avec Google" };
		},
		{
			query: t.Object({
				code: t.Optional(t.String()),
				state: t.Optional(t.String()),
			}),
			response: {
				200: SuccessMessageResponse,
				302: t.Void({ description: "Redirection vers le frontend" }),
				400: ErrorResponse,
				502: ErrorResponse,
				503: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Callback Google OAuth",
				description: "Callback de retour après authentification Google",
			},
		},
	)
	.get(
		"/discord/callback",
		async ({ query, set, request }) => {
			const code = query.code as string | undefined;
			const state = query.state as string | undefined;
			const cookieHeader = request.headers.get("Cookie") ?? null;
			const storedState = getCookie("oauth_state", cookieHeader);

			if (!code || !state || !storedState || state !== storedState) {
				set.status = 400;
				return {
					success: false,
					error: "Requête invalide ou expirée (state/code)",
				};
			}

			const discord = createDiscordOAuth();
			if (!discord) {
				set.status = 503;
				return { success: false, error: "OAuth Discord non configuré" };
			}

			let tokens: arctic.OAuth2Tokens<unknown>;
			try {
				tokens = await discord.validateAuthorizationCode(code, null);
			} catch (e) {
				if (e instanceof arctic.OAuth2RequestError) {
					set.status = 400;
					return {
						success: false,
						error: "Code d’autorisation invalide ou expiré",
					};
				}
				set.status = 502;
				return { success: false, error: "Erreur OAuth" };
			}

			const profile = await getDiscordProfile(tokens);
			if (!profile) {
				set.status = 502;
				return {
					success: false,
					error: "Impossible de récupérer le profil Discord",
				};
			}

			const result = await oauthCallbackHandler("discord", profile);
			if (!result.success) {
				set.status = 400;
				return { success: false, error: result.error };
			}

			const frontUrl = getFrontRedirectUrl();
			if (frontUrl) {
				set.status = 302;
				set.headers.Location = frontUrl;
				set.headers["Set-Cookie"] = result.setCookieHeader;
				return;
			}
			set.status = 200;
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true, message: "Connecté avec Discord" };
		},
		{
			query: t.Object({
				code: t.Optional(t.String()),
				state: t.Optional(t.String()),
			}),
			response: {
				200: SuccessMessageResponse,
				302: t.Void({ description: "Redirection vers le frontend" }),
				400: ErrorResponse,
				502: ErrorResponse,
				503: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Callback Discord OAuth",
				description: "Callback de retour après authentification Discord",
			},
		},
	)
	.get(
		"/apple/callback",
		async ({ query, set, request }) => {
			const code = query.code as string | undefined;
			const state = query.state as string | undefined;
			const cookieHeader = request.headers.get("Cookie") ?? null;
			const storedState = getCookie("oauth_state", cookieHeader);

			if (!code || !state || !storedState || state !== storedState) {
				set.status = 400;
				return {
					success: false,
					error: "Requête invalide ou expirée (state/code)",
				};
			}

			const apple = createAppleOAuth();
			if (!apple) {
				set.status = 503;
				return { success: false, error: "OAuth Apple non configuré" };
			}

			let tokens: arctic.OAuth2Tokens<unknown>;
			try {
				tokens = await apple.validateAuthorizationCode(code);
			} catch (e) {
				if (e instanceof arctic.OAuth2RequestError) {
					set.status = 400;
					return {
						success: false,
						error: "Code d’autorisation invalide ou expiré",
					};
				}
				set.status = 502;
				return { success: false, error: "Erreur OAuth" };
			}

			const profile = getAppleProfileFromIdToken(tokens, null);
			if (!profile) {
				set.status = 502;
				return {
					success: false,
					error: "Impossible de récupérer le profil Apple",
				};
			}

			const result = await oauthCallbackHandler("apple", profile);
			if (!result.success) {
				set.status = 400;
				return { success: false, error: result.error };
			}

			const frontUrl = getFrontRedirectUrl();
			if (frontUrl) {
				set.status = 302;
				set.headers.Location = frontUrl;
				set.headers["Set-Cookie"] = result.setCookieHeader;
				return;
			}
			set.status = 200;
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true, message: "Connecté avec Apple" };
		},
		{
			query: t.Object({
				code: t.Optional(t.String()),
				state: t.Optional(t.String()),
			}),
			response: {
				200: SuccessMessageResponse,
				302: t.Void({ description: "Redirection vers le frontend" }),
				400: ErrorResponse,
				502: ErrorResponse,
				503: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Callback Apple OAuth (GET)",
				description:
					"Callback de retour après authentification Apple (méthode GET)",
			},
		},
	)
	.post(
		"/apple/callback",
		async ({ body, set, request }) => {
			// Apple peut renvoyer en form_post (application/x-www-form-urlencoded) avec code, state, user (JSON)
			let formBody: Record<string, unknown>;
			const contentType = request.headers.get("content-type") ?? "";
			if (contentType.includes("application/x-www-form-urlencoded")) {
				const raw = await request.text();
				formBody = Object.fromEntries(new URLSearchParams(raw)) as Record<
					string,
					unknown
				>;
			} else {
				formBody = (body ?? {}) as Record<string, unknown>;
			}
			const code = formBody?.code as string | undefined;
			const state = formBody?.state as string | undefined;
			const userParam = formBody?.user;
			let userPayload: AppleUserPayload | null = null;
			if (userParam && typeof userParam === "string") {
				try {
					userPayload = JSON.parse(
						decodeURIComponent(userParam),
					) as AppleUserPayload;
				} catch {
					// ignorer
				}
			}
			const cookieHeader = request.headers.get("Cookie") ?? null;
			const storedState = getCookie("oauth_state", cookieHeader);

			if (!code || !state || !storedState || state !== storedState) {
				set.status = 400;
				return {
					success: false,
					error: "Requête invalide ou expirée (state/code)",
				};
			}

			const apple = createAppleOAuth();
			if (!apple) {
				set.status = 503;
				return { success: false, error: "OAuth Apple non configuré" };
			}

			let tokens: arctic.OAuth2Tokens<unknown>;
			try {
				tokens = await apple.validateAuthorizationCode(code);
			} catch (e) {
				if (e instanceof arctic.OAuth2RequestError) {
					set.status = 400;
					return {
						success: false,
						error: "Code d’autorisation invalide ou expiré",
					};
				}
				set.status = 502;
				return { success: false, error: "Erreur OAuth" };
			}

			const profile = getAppleProfileFromIdToken(tokens, userPayload);
			if (!profile) {
				set.status = 502;
				return {
					success: false,
					error: "Impossible de récupérer le profil Apple",
				};
			}

			const result = await oauthCallbackHandler("apple", profile);
			if (!result.success) {
				set.status = 400;
				return { success: false, error: result.error };
			}

			const frontUrl = getFrontRedirectUrl();
			if (frontUrl) {
				set.status = 302;
				set.headers.Location = frontUrl;
				set.headers["Set-Cookie"] = result.setCookieHeader;
				return;
			}
			set.status = 200;
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true, message: "Connecté avec Apple" };
		},
		{
			response: {
				200: SuccessMessageResponse,
				302: t.Void({ description: "Redirection vers le frontend" }),
				400: ErrorResponse,
				502: ErrorResponse,
				503: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Callback Apple OAuth (POST)",
				description:
					"Callback de retour après authentification Apple (form_post)",
			},
		},
	);
