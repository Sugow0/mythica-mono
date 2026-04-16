import { prisma } from "../../../../lib/prisma";
import { deletePending2fa } from "./two-fa.constants";

export type DisableTwoFaResult =
	| { success: true }
	| { success: false; error: string };

/** Désactive la 2FA après vérification du mot de passe. */
export async function disableTwoFaHandler(
	userId: string,
	password: string,
): Promise<DisableTwoFaResult> {
	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: { password: true, twoFactorSecret: true },
	});
	if (!user) {
		return { success: false, error: "Utilisateur introuvable." };
	}
	if (!user.twoFactorSecret) {
		return { success: false, error: "La 2FA n'est pas activée." };
	}
	if (!user.password) {
		return {
			success: false,
			error:
				"Compte OAuth : impossible de désactiver la 2FA sans mot de passe.",
		};
	}

	const valid = await Bun.password.verify(password, user.password, "argon2id");
	if (!valid) {
		return { success: false, error: "Mot de passe incorrect." };
	}

	await prisma.users.update({
		where: { id: userId },
		data: { twoFactorSecret: null },
	});
	await deletePending2fa(userId);

	return { success: true };
}
