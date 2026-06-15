import { sendPasswordResetEmail } from "../../../../lib/email";
import { prisma } from "../../../../lib/prisma";
import type { ForgotPasswordCommand } from "./forgot-password.command";

/** Durée de validité d'un lien de réinitialisation (minutes). */
const RESET_EXPIRY_MINUTES = 60;

/** Génère un token de réinitialisation aléatoire (64 hex). */
function generateResetToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ForgotPasswordResult = { success: true };

/**
 * Demande de réinitialisation : si un compte correspond à l'email, génère un
 * token et envoie le lien par email. La réponse est identique que le compte
 * existe ou non (protection contre l'énumération des comptes).
 */
export async function forgotPasswordHandler(
	command: ForgotPasswordCommand,
): Promise<ForgotPasswordResult> {
	const email = command.email.trim();
	const user = await prisma.users.findUnique({
		where: { email },
		select: { id: true, pseudo: true },
	});

	if (user) {
		const token = generateResetToken();
		const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);
		await prisma.passwordResetTokens.deleteMany({ where: { userId: user.id } });
		await prisma.passwordResetTokens.create({
			data: { token, userId: user.id, expiresAt },
		});
		await sendPasswordResetEmail(email, token, user.pseudo);
	}

	return { success: true };
}
