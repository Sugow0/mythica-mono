import { lucia } from "../../../../lib/auth";
import { hashPassword } from "../../../../lib/password";
import { prisma } from "../../../../lib/prisma";
import type { ResetPasswordCommand } from "./reset-password.command";

const INVALID =
	"Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.";

export type ResetPasswordResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Réinitialise le mot de passe à partir d'un token valide : met à jour le hash,
 * supprime les tokens de l'utilisateur et invalide toutes ses sessions actives.
 */
export async function resetPasswordHandler(
	command: ResetPasswordCommand,
): Promise<ResetPasswordResult> {
	const token = command.token?.trim();
	if (!token) {
		return { success: false, error: INVALID };
	}

	const record = await prisma.passwordResetTokens.findUnique({
		where: { token },
	});
	if (!record) {
		return { success: false, error: INVALID };
	}
	if (record.expiresAt < new Date()) {
		await prisma.passwordResetTokens
			.delete({ where: { id: record.id } })
			.catch(() => {});
		return { success: false, error: INVALID };
	}

	const passwordHash = await hashPassword(command.newPassword);
	await prisma.$transaction([
		prisma.users.update({
			where: { id: record.userId },
			data: { password: passwordHash },
		}),
		prisma.passwordResetTokens.deleteMany({ where: { userId: record.userId } }),
	]);

	// Sécurité : invalider toutes les sessions actives après un reset.
	await lucia.invalidateUserSessions(record.userId);

	return { success: true };
}
