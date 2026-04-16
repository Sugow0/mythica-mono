import { prisma } from "../../../../lib/prisma";
import type { ChangePasswordBody } from "./change-password.dto";

const PASSWORD_HASH_OPTIONS = {
	algorithm: "argon2id" as const,
	memoryCost: 19_456,
	timeCost: 2,
};

export type ChangePasswordResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Change le mot de passe de l'utilisateur.
 * Autorisé uniquement si email vérifié OU 2FA activée.
 */
export async function changePasswordHandler(
	userId: string,
	body: ChangePasswordBody,
): Promise<ChangePasswordResult> {
	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: {
			password: true,
			emailVerified: true,
			twoFactorSecret: true,
		},
	});

	if (!user) {
		return { success: false, error: "Utilisateur introuvable." };
	}

	if (!user.password) {
		return {
			success: false,
			error:
				"Ce compte utilise une connexion OAuth. Impossible de changer le mot de passe.",
		};
	}

	const canChange =
		user.emailVerified === true ||
		(user.twoFactorSecret != null && user.twoFactorSecret !== "");

	if (!canChange) {
		return {
			success: false,
			error:
				"Changement de mot de passe autorisé uniquement si votre email est vérifié ou si la 2FA est activée.",
		};
	}

	const valid = await Bun.password.verify(
		body.currentPassword,
		user.password,
		"argon2id",
	);
	if (!valid) {
		return { success: false, error: "Mot de passe actuel incorrect." };
	}

	const newHash = await Bun.password.hash(
		body.newPassword,
		PASSWORD_HASH_OPTIONS,
	);
	await prisma.users.update({
		where: { id: userId },
		data: { password: newHash },
	});

	return { success: true };
}
