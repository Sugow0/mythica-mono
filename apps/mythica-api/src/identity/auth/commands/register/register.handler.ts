import { generateIdFromEntropySize } from "lucia";
import { lucia } from "../../../../lib/auth";
import { sendVerificationEmail } from "../../../../lib/email";
import { prisma } from "../../../../lib/prisma";
import { publishUserEvent } from "../../../../lib/user-events";
import type { RegisterCommand } from "./register.command";

const PASSWORD_HASH_OPTIONS = {
	algorithm: "argon2id" as const,
	memoryCost: 19_456,
	timeCost: 2,
};

const VERIFICATION_EXPIRY_HOURS = 24;

function generateVerificationToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type RegisterResult =
	| { success: true; sessionId: string; setCookieHeader: string }
	| { success: false; error: string };

/** Handler CQRS : exécute la commande Register (création user + session Lucia + email de vérification). */
export async function registerHandler(
	command: RegisterCommand,
): Promise<RegisterResult> {
	const passwordHash = await Bun.password.hash(
		command.password,
		PASSWORD_HASH_OPTIONS,
	);
	const userId = generateIdFromEntropySize(10);
	const verificationToken = generateVerificationToken();
	const expiresAt = new Date(
		Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
	);

	try {
		await prisma.users.create({
			data: {
				id: userId,
				email: command.email,
				password: passwordHash,
				firstName: command.firstName,
				lastName: command.lastName,
				pseudo: command.pseudo,
				emailVerificationTokens: {
					create: { token: verificationToken, expiresAt },
				},
			},
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (
			msg.includes("Unique constraint") ||
			msg.includes("unique") ||
			msg.includes("duplicate")
		) {
			return { success: false, error: "Email ou pseudo déjà utilisé" };
		}
		return { success: false, error: "Erreur lors de la création du compte" };
	}

	await publishUserEvent("user.created", userId);
	await sendVerificationEmail(command.email, verificationToken, command.pseudo);

	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	return {
		success: true,
		sessionId: session.id,
		setCookieHeader: sessionCookie.serialize(),
	};
}
