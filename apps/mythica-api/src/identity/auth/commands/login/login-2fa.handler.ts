import { verifyTOTP } from "@oslojs/otp";
import { lucia } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { deleteLogin2fa, getLogin2fa } from "../two-fa/two-fa.constants";
import { hexToSecret, TOTP_DIGITS, TOTP_PERIOD } from "../two-fa/two-fa.utils";

export type Login2FaResult =
	| { success: true; setCookieHeader: string }
	| { success: false; error: string };

/** Complète le login 2FA : vérifie le code TOTP et crée la session. */
export async function login2FaHandler(
	tempToken: string,
	code: string,
): Promise<Login2FaResult> {
	const trimmedCode = code.trim().replace(/\s/g, "");
	if (trimmedCode.length !== TOTP_DIGITS || !/^\d+$/.test(trimmedCode)) {
		return { success: false, error: "Code invalide (6 chiffres attendus)." };
	}

	const userId = await getLogin2fa(tempToken);
	if (!userId) {
		return {
			success: false,
			error:
				"Lien de connexion expiré. Reconnectez-vous avec votre mot de passe.",
		};
	}

	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: { twoFactorSecret: true, role: true },
	});
	if (!user?.twoFactorSecret) {
		await deleteLogin2fa(tempToken);
		return {
			success: false,
			error: "2FA désactivée pour ce compte. Reconnectez-vous.",
		};
	}

	const secret = hexToSecret(user.twoFactorSecret);
	const valid = verifyTOTP(secret, TOTP_PERIOD, TOTP_DIGITS, trimmedCode);
	if (!valid) {
		return { success: false, error: "Code incorrect." };
	}

	await deleteLogin2fa(tempToken);
	const session = await lucia.createSession(userId, { role: user.role });
	const sessionCookie = lucia.createSessionCookie(session.id);

	return {
		success: true,
		setCookieHeader: sessionCookie.serialize(),
	};
}
