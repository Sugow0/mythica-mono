import { sendVerificationEmail } from "../../../../lib/email";
import { prisma } from "../../../../lib/prisma";
import type { ResendVerificationCommand } from "./resend-verification.command";

export type ResendVerificationResult =
	| { success: true }
	| { success: false; error: string };

const VERIFICATION_EXPIRY_HOURS = 24;

function generateToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Crée un nouveau token et renvoie l'email de vérification (par userId session ou par email). */
export async function resendVerificationHandler(
	command: ResendVerificationCommand,
): Promise<ResendVerificationResult> {
	let user: {
		id: string;
		email: string;
		emailVerified: boolean;
		pseudo: string;
	} | null = null;

	if (command.userId) {
		user = await prisma.users.findUnique({
			where: { id: command.userId },
			select: { id: true, email: true, emailVerified: true, pseudo: true },
		});
	} else if (command.email?.trim()) {
		user = await prisma.users.findUnique({
			where: { email: command.email.trim() },
			select: { id: true, email: true, emailVerified: true, pseudo: true },
		});
	}

	if (!user) {
		return { success: false, error: "Compte introuvable." };
	}
	if (user.emailVerified) {
		return { success: false, error: "Cet email est déjà vérifié." };
	}

	const expiresAt = new Date(
		Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
	);
	const token = generateToken();

	await prisma.emailVerificationToken.deleteMany({
		where: { userId: user.id },
	});
	await prisma.emailVerificationToken.create({
		data: { userId: user.id, token, expiresAt },
	});

	const sendResult = await sendVerificationEmail(
		user.email,
		token,
		user.pseudo,
	);
	if (!sendResult.success) {
		return { success: false, error: sendResult.error };
	}

	return { success: true };
}
