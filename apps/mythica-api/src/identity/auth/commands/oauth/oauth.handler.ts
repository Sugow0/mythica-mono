import { generateIdFromEntropySize } from "lucia";
import { lucia } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { publishUserEvent } from "../../../../lib/user-events";
import type { OAuthProfile, OAuthProviderId } from "./oauth.types";

export type OAuthCallbackResult =
	| { success: true; setCookieHeader: string }
	| { success: false; error: string };

/**
 * Crée ou lie un utilisateur à partir d'un compte OAuth, puis crée une session Lucia.
 */
export async function oauthCallbackHandler(
	providerId: OAuthProviderId,
	profile: OAuthProfile,
): Promise<OAuthCallbackResult> {
	const providerUserId = profile.providerUserId;
	const email = profile.email.trim().toLowerCase();
	if (!email) {
		return {
			success: false,
			error: "Email non fourni par le fournisseur OAuth",
		};
	}

	// Chercher un OAuthAccount existant
	const existingAccount = await prisma.oAuthAccounts.findUnique({
		where: {
			providerId_providerUserId: { providerId, providerUserId },
		},
		include: { user: true },
	});

	let userId: string;
	let userRole: string;

	if (existingAccount) {
		userId = existingAccount.user.id;
		userRole = existingAccount.user.role;
	} else {
		// Chercher un user existant avec le même email (liaison de compte)
		const existingUser = await prisma.users.findUnique({
			where: { email },
		});

		if (existingUser) {
			userId = existingUser.id;
			userRole = existingUser.role;
			await prisma.oAuthAccounts.create({
				data: {
					id: generateIdFromEntropySize(10),
					providerId,
					providerUserId,
					userId: existingUser.id,
				},
			});
		} else {
			// Nouvel utilisateur : générer un pseudo unique si collision
			let pseudo = profile.pseudo;
			for (let i = 0; ; i++) {
				const suffix = i === 0 ? "" : `_${i}`;
				const candidate = (pseudo + suffix).slice(0, 50);
				const taken = await prisma.users.findUnique({
					where: { pseudo: candidate },
				});
				if (!taken) {
					pseudo = candidate;
					break;
				}
			}

			userId = generateIdFromEntropySize(10);
			userRole = "USER";
			await prisma.$transaction([
				prisma.users.create({
					data: {
						id: userId,
						email,
						password: null,
						firstName: profile.firstName,
						lastName: profile.lastName,
						pseudo,
					},
				}),
				prisma.oAuthAccounts.create({
					data: {
						id: generateIdFromEntropySize(10),
						providerId,
						providerUserId,
						userId,
					},
				}),
			]);
			await publishUserEvent("user.created", userId);
		}
	}

	const session = await lucia.createSession(userId, { role: userRole });
	const sessionCookie = lucia.createSessionCookie(session.id);

	return {
		success: true,
		setCookieHeader: sessionCookie.serialize(),
	};
}
