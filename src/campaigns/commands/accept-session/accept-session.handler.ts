import { prisma } from "../../../lib/prisma";

export type AcceptSessionResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : accepter une session planifiée.
 * Un membre de la campagne peut accepter de participer à une session.
 */
export async function acceptSessionHandler(
	campaignId: string,
	sessionId: string,
	userId: string,
): Promise<AcceptSessionResult> {
	const session = await prisma.campaignSessions.findFirst({
		where: { id: sessionId, campaignId },
		select: {
			status: true,
			campaign: {
				select: {
					creatorId: true,
					members: {
						where: { userId },
						select: { userId: true },
					},
				},
			},
		},
	});

	if (!session) {
		return { success: false, error: "Session introuvable" };
	}

	if (session.status !== "SCHEDULED") {
		return { success: false, error: "Cette session n'est plus disponible" };
	}

	const isCreator = session.campaign.creatorId === userId;
	const isMember = session.campaign.members.length > 0;

	if (!isCreator && !isMember) {
		return {
			success: false,
			error:
				"Vous devez être membre de la campagne pour accepter cette session",
		};
	}

	// Upsert la réponse (créer ou mettre à jour)
	await prisma.campaignSessionResponses.upsert({
		where: {
			sessionId_userId: { sessionId, userId },
		},
		create: {
			sessionId,
			userId,
			status: "ACCEPTED",
		},
		update: {
			status: "ACCEPTED",
		},
	});

	return { success: true };
}
