import { generateIdFromEntropySize } from "lucia";
import { lucia } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { checkLoginRateLimit } from "../../../../lib/rate-limit";
import { setLogin2fa } from "../two-fa/two-fa.constants";
import type { LoginCommand } from "./login.command";

const INVALID_CREDENTIALS_MESSAGE = "Email ou mot de passe incorrect";

export type LoginResult =
	| { success: true; setCookieHeader: string }
	| { success: true; requiresTwoFactor: true; tempToken: string }
	| {
			success: false;
			error: string;
			status: 400 | 429;
			retryAfterSec?: number;
	  };

/** Handler CQRS : login avec rate limit et vérification mot de passe. Si 2FA activée, retourne tempToken. */
export async function loginHandler(
	command: LoginCommand,
): Promise<LoginResult> {
	const rateLimit = await checkLoginRateLimit(command.rateLimitKey);
	if (!rateLimit.allowed) {
		return {
			success: false,
			error: "Trop de tentatives. Réessayez plus tard.",
			status: 429,
			retryAfterSec: rateLimit.retryAfterSec,
		};
	}

	const user = await prisma.users.findUnique({
		where: { email: command.email },
	});
	if (!user) {
		return { success: false, error: INVALID_CREDENTIALS_MESSAGE, status: 400 };
	}
	if (!user.password) {
		return {
			success: false,
			error:
				"Ce compte utilise une connexion Google, Discord ou Apple. Connectez-vous avec ce fournisseur.",
			status: 400,
		};
	}

	const valid = await Bun.password.verify(command.password, user.password);
	if (!valid) {
		return { success: false, error: INVALID_CREDENTIALS_MESSAGE, status: 400 };
	}

	if (user.twoFactorSecret) {
		const tempToken = generateIdFromEntropySize(16);
		await setLogin2fa(tempToken, user.id);
		return {
			success: true,
			requiresTwoFactor: true,
			tempToken,
		};
	}

	const session = await lucia.createSession(user.id, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	return {
		success: true,
		setCookieHeader: sessionCookie.serialize(),
	};
}
