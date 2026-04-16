import { verifyTOTP } from "@oslojs/otp";
import { sendVerificationEmail } from "../../../../lib/email";
import { prisma } from "../../../../lib/prisma";
import {
	hexToSecret,
	TOTP_DIGITS,
	TOTP_PERIOD,
} from "../../../auth/commands/two-fa/two-fa.utils";
import type { ChangeEmailBody } from "./change-email.dto";

const VERIFICATION_EXPIRY_HOURS = 24;

function generateToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ChangeEmailResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Change l'email de l'utilisateur.
 * Autorisé uniquement si la 2FA est activée (vérification du code TOTP).
 */
export async function changeEmailHandler(
	userId: string,
	body: ChangeEmailBody,
): Promise<ChangeEmailResult> {
	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: { email: true, twoFactorSecret: true, pseudo: true },
	});

	if (!user) {
		return { success: false, error: "Utilisateur introuvable." };
	}

	if (!user.twoFactorSecret || user.twoFactorSecret === "") {
		return {
			success: false,
			error: "Changement d'email autorisé uniquement si la 2FA est activée.",
		};
	}

	const secret = hexToSecret(user.twoFactorSecret);
	const valid = verifyTOTP(secret, TOTP_PERIOD, TOTP_DIGITS, body.code);
	if (!valid) {
		return { success: false, error: "Code 2FA incorrect." };
	}

	const newEmail = body.newEmail.trim().toLowerCase();
	if (newEmail === user.email) {
		return {
			success: false,
			error: "La nouvelle adresse est identique à l'actuelle.",
		};
	}

	const existing = await prisma.users.findUnique({
		where: { email: newEmail },
		select: { id: true },
	});
	if (existing) {
		return { success: false, error: "Cette adresse email est déjà utilisée." };
	}

	const expiresAt = new Date(
		Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
	);
	const token = generateToken();

	await prisma.$transaction([
		prisma.users.update({
			where: { id: userId },
			data: {
				email: newEmail,
				emailVerified: false,
				emailVerifiedAt: null,
			},
		}),
		prisma.emailVerificationToken.deleteMany({ where: { userId } }),
		prisma.emailVerificationToken.create({
			data: { userId, token, expiresAt },
		}),
	]);

	const sendResult = await sendVerificationEmail(newEmail, token, user.pseudo);
	if (!sendResult.success) {
		return { success: false, error: sendResult.error };
	}

	return { success: true };
}
