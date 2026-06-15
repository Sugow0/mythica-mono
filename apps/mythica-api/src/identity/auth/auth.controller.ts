import { Elysia, t } from "elysia";
import { ErrorResponse, SuccessMessageResponse } from "../../lib/schemas";
import { getSessionFromRequest } from "../../lib/session";
import {
	type ForgotPasswordBody,
	forgotPasswordRouteSchema,
} from "./commands/forgot-password/forgot-password.dto";
import { forgotPasswordHandler } from "./commands/forgot-password/forgot-password.handler";
import { type LoginBody, loginRouteSchema } from "./commands/login/login.dto";
import { loginHandler } from "./commands/login/login.handler";
import { login2FaHandler } from "./commands/login/login-2fa.handler";
import { logoutHandler } from "./commands/logout/logout.handler";
import {
	type RegisterBody,
	registerRouteSchema,
} from "./commands/register/register.dto";
import { registerHandler } from "./commands/register/register.handler";
import { resendVerificationHandler } from "./commands/resend-verification/resend-verification.handler";
import {
	type ResetPasswordBody,
	resetPasswordRouteSchema,
} from "./commands/reset-password/reset-password.dto";
import { resetPasswordHandler } from "./commands/reset-password/reset-password.handler";
import { confirmTwoFaHandler } from "./commands/two-fa/confirm-two-fa.handler";
import { disableTwoFaHandler } from "./commands/two-fa/disable-two-fa.handler";
import { setupTwoFaHandler } from "./commands/two-fa/setup-two-fa.handler";
import { verifyEmailHandler } from "./commands/verify-email/verify-email.handler";
import { oauthRoutes as oauthController } from "./oauth.controller";

function getClientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) return forwarded.split(",")[0]?.trim() ?? "anonymous";
	return request.headers.get("x-real-ip") ?? "anonymous";
}

/** Routes auth : register, verify-email, resend-verification, login, login/2fa, logout, OAuth, 2fa. */
export const authController = new Elysia()
	.use(oauthController)
	.post(
		"/register",
		async ({ body, set }) => {
			const result = await registerHandler(body as RegisterBody);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return {
				success: true as const,
				message: "Compte créé. Un email de vérification a été envoyé.",
			};
		},
		{
			...registerRouteSchema,
			response: {
				201: SuccessMessageResponse,
				400: ErrorResponse,
				409: ErrorResponse,
			},
		},
	)
	.post(
		"/verify-email",
		async ({ body, set }) => {
			const token =
				typeof (body as { token?: string })?.token === "string"
					? (body as { token: string }).token
					: "";
			const result = await verifyEmailHandler({ token });
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Email vérifié." };
		},
		{
			body: t.Object({
				token: t.String({ description: "Token de vérification email" }),
			}),
			response: { 200: SuccessMessageResponse, 400: ErrorResponse },
			detail: {
				tags: ["Identity"],
				summary: "Vérifier l'email",
				description: "Valide l'adresse email avec le token reçu par email",
			},
		},
	)
	.post(
		"/forgot-password",
		async ({ body }) => {
			await forgotPasswordHandler(body as ForgotPasswordBody);
			// Réponse volontairement identique que le compte existe ou non.
			return {
				success: true as const,
				message:
					"Si un compte correspond, un email de réinitialisation a été envoyé.",
			};
		},
		forgotPasswordRouteSchema,
	)
	.post(
		"/reset-password",
		async ({ body, set }) => {
			const result = await resetPasswordHandler(body as ResetPasswordBody);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Mot de passe réinitialisé." };
		},
		resetPasswordRouteSchema,
	)
	.post(
		"/resend-verification",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			const bodyObj = body as { email?: string } | null;
			const email =
				typeof bodyObj?.email === "string" ? bodyObj.email.trim() : undefined;
			const result = await resendVerificationHandler({
				userId: sessionResult.ok ? sessionResult.user.id : undefined,
				email: email ?? undefined,
			});
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Email de vérification renvoyé.",
			};
		},
		{
			body: t.Object({
				email: t.Optional(
					t.String({
						format: "email",
						description: "Adresse email (optionnel si connecté)",
					}),
				),
			}),
			response: { 200: SuccessMessageResponse, 400: ErrorResponse },
			detail: {
				tags: ["Identity"],
				summary: "Renvoyer l'email de vérification",
				description: "Renvoie un email de vérification",
			},
		},
	)
	.post(
		"/login",
		async ({ body, set, request }) => {
			const result = await loginHandler({
				email: (body as LoginBody).email,
				password: (body as LoginBody).password,
				rateLimitKey: getClientIp(request),
			});
			if (!result.success) {
				set.status = result.status;
				if (result.status === 429 && result.retryAfterSec != null) {
					set.headers["Retry-After"] = String(result.retryAfterSec);
				}
				return { success: false as const, error: result.error };
			}
			if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
				return {
					success: true as const,
					requiresTwoFactor: true as const,
					tempToken: result.tempToken,
				};
			}
			if ("setCookieHeader" in result)
				set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true as const, message: "Connecté" };
		},
		loginRouteSchema,
	)
	.post(
		"/login/2fa",
		async ({ body, set }) => {
			const b = body as { tempToken: string; code: string };
			const result = await login2FaHandler(b.tempToken, b.code);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true as const, message: "Connecté" };
		},
		{
			body: t.Object({
				tempToken: t.String({
					description: "Token temporaire de la première étape",
				}),
				code: t.String({
					pattern: "^\\d{6}$",
					description: "Code TOTP 2FA (6 chiffres)",
				}),
			}),
			response: { 200: SuccessMessageResponse, 400: ErrorResponse },
			detail: {
				tags: ["Identity"],
				summary: "Connexion 2FA",
				description: "Complète la connexion avec le code 2FA",
			},
		},
	)
	.post(
		"/logout",
		async ({ set, request }) => {
			const cookieHeader = request.headers.get("Cookie") ?? null;
			const result = await logoutHandler(cookieHeader);
			set.headers["Set-Cookie"] = result.setCookieHeader;
			return { success: true as const, message: "Déconnecté" };
		},
		{
			response: { 200: SuccessMessageResponse },
			detail: {
				tags: ["Identity"],
				summary: "Déconnexion",
				description: "Déconnecte l'utilisateur",
			},
		},
	)
	.post(
		"/2fa/setup",
		async ({ set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await setupTwoFaHandler(sessionResult.user.id);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				totpKeyUri: result.totpKeyUri,
				qrCodeDataUrl: result.qrCodeDataUrl,
			};
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
					totpKeyUri: t.String({
						description: "URI TOTP pour les apps d'authentification",
					}),
					qrCodeDataUrl: t.String({ description: "QR code en data URL" }),
				}),
				400: ErrorResponse,
				401: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Configurer la 2FA",
				description: "Génère un secret TOTP pour activer la 2FA",
			},
		},
	)
	.post(
		"/2fa/confirm",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const code = (body as { code: string }).code;
			const result = await confirmTwoFaHandler(sessionResult.user.id, code);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "2FA activée." };
		},
		{
			body: t.Object({
				code: t.String({
					pattern: "^\\d{6}$",
					description: "Code TOTP pour confirmer",
				}),
			}),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Confirmer la 2FA",
				description: "Active la 2FA en validant le code TOTP",
			},
		},
	)
	.post(
		"/2fa/disable",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const password = (body as { password: string }).password;
			const result = await disableTwoFaHandler(sessionResult.user.id, password);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "2FA désactivée." };
		},
		{
			body: t.Object({
				password: t.String({
					description: "Mot de passe actuel pour confirmer",
				}),
			}),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Désactiver la 2FA",
				description: "Désactive la 2FA",
			},
		},
	);
