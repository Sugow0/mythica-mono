import { createTOTPKeyURI } from "@oslojs/otp";
import QRCode from "qrcode";
import { prisma } from "../../../../lib/prisma";
import { setPending2fa } from "./two-fa.constants";
import {
	generateSecretBytes,
	secretToHex,
	TOTP_DIGITS,
	TOTP_PERIOD,
} from "./two-fa.utils";

const APP_NAME = process.env.APP_NAME ?? "Mythica";

export type SetupTwoFaResult =
	| { success: true; totpKeyUri: string; qrCodeDataUrl: string }
	| { success: false; error: string };

/** Génère un secret TOTP, le stocke en Redis (pending), retourne l'URI et un QR code en data URL. */
export async function setupTwoFaHandler(
	userId: string,
): Promise<SetupTwoFaResult> {
	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: { email: true, twoFactorSecret: true },
	});
	if (!user) {
		return { success: false, error: "Utilisateur introuvable." };
	}
	if (user.twoFactorSecret) {
		return {
			success: false,
			error:
				"La 2FA est déjà activée. Désactivez-la d'abord pour la reconfigurer.",
		};
	}

	const secret = generateSecretBytes();
	const secretHex = secretToHex(secret);
	await setPending2fa(userId, secretHex);

	const totpKeyUri = createTOTPKeyURI(
		APP_NAME,
		user.email,
		secret,
		TOTP_PERIOD,
		TOTP_DIGITS,
	);
	let qrCodeDataUrl: string;
	try {
		qrCodeDataUrl = await QRCode.toDataURL(totpKeyUri, { margin: 2 });
	} catch {
		return {
			success: false,
			error: "Erreur lors de la génération du QR code.",
		};
	}

	return {
		success: true,
		totpKeyUri,
		qrCodeDataUrl,
	};
}
