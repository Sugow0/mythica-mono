import { prisma } from "../../../../lib/prisma";
import type { VerifyEmailCommand } from "./verify-email.command";

export type VerifyEmailResult =
	| { success: true }
	| { success: false; error: string };

const TOKEN_EXPIRED =
	"Lien expiré ou invalide. Demandez un nouvel email de vérification.";
const INVALID_TOKEN = "Token invalide.";

/** Vérifie le token et marque l'email comme vérifié. */
export async function verifyEmailHandler(
	command: VerifyEmailCommand,
): Promise<VerifyEmailResult> {
	if (!command.token?.trim()) {
		return { success: false, error: INVALID_TOKEN };
	}

	const record = await prisma.emailVerificationToken.findUnique({
		where: { token: command.token.trim() },
		include: { user: true },
	});

	if (!record) {
		return { success: false, error: TOKEN_EXPIRED };
	}
	if (record.expiresAt < new Date()) {
		await prisma.emailVerificationToken
			.delete({ where: { id: record.id } })
			.catch(() => {});
		return { success: false, error: TOKEN_EXPIRED };
	}

	await prisma.$transaction([
		prisma.users.update({
			where: { id: record.userId },
			data: { emailVerified: true, emailVerifiedAt: new Date() },
		}),
		prisma.emailVerificationToken.delete({ where: { id: record.id } }),
	]);

	return { success: true };
}
