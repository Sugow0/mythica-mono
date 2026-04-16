import { verifyTOTP } from "@oslojs/otp";
import { prisma } from "../../../../lib/prisma";
import { deletePending2fa, getPending2fa } from "./two-fa.constants";
import { hexToSecret, TOTP_DIGITS, TOTP_PERIOD } from "./two-fa.utils";

export type ConfirmTwoFaResult =
	| { success: true }
	| { success: false; error: string };

/** Vérifie le code TOTP et enregistre le secret 2FA sur l'utilisateur. */
export async function confirmTwoFaHandler(
	userId: string,
	code: string,
): Promise<ConfirmTwoFaResult> {
	const trimmedCode = code.trim().replace(/\s/g, "");
	if (trimmedCode.length !== TOTP_DIGITS || !/^\d+$/.test(trimmedCode)) {
		return { success: false, error: "Code invalide (6 chiffres attendus)." };
	}

	const secretHex = await getPending2fa(userId);
	if (!secretHex) {
		return {
			success: false,
			error: "Configuration 2FA expirée. Recommencez l'activation.",
		};
	}

	const secret = hexToSecret(secretHex);
	const valid = verifyTOTP(secret, TOTP_PERIOD, TOTP_DIGITS, trimmedCode);
	if (!valid) {
		return { success: false, error: "Code incorrect." };
	}

	await prisma.users.update({
		where: { id: userId },
		data: { twoFactorSecret: secretHex },
	});
	await deletePending2fa(userId);

	return { success: true };
}
