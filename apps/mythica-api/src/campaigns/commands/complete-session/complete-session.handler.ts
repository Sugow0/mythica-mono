import { prisma } from "../../../lib/prisma";

export type CompleteSessionResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : marquer une session comme terminée.
 * Seul le créateur ou un admin peut marquer une session comme terminée.
 */
export async function completeSessionHandler(
	campaignId: string,
	sessionId: string,
	userId: string,
): Promise<CompleteSessionResult> {
	const session = await prisma.campaignSessions.findFirst({
		where: { id: sessionId, campaignId },
		select: {
			status: true,
			campaign: {
				select: {
					creatorId: true,
					members: {
						where: { userId },
						select: { role: true },
					},
				},
			},
		},
	});

	if (!session) {
		return { success: false, error: "Session introuvable" };
	}

	if (session.status !== "SCHEDULED") {
		return {
			success: false,
			error: "Seule une session planifiée peut être marquée comme terminée",
		};
	}

	const isCreator = session.campaign.creatorId === userId;
	const isAdmin = session.campaign.members.some((m) => m.role === "ADMIN");

	if (!isCreator && !isAdmin) {
		return {
			success: false,
			error:
				"Seul le créateur ou un admin peut marquer une session comme terminée",
		};
	}

	await prisma.campaignSessions.update({
		where: { id: sessionId },
		data: { status: "COMPLETED" },
	});

	return { success: true };
}
