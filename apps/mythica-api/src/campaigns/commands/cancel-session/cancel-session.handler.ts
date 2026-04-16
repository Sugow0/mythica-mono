import { prisma } from "../../../lib/prisma";

export type CancelSessionResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : annuler une session planifiée.
 * Seul le créateur ou un admin peut annuler une session.
 */
export async function cancelSessionHandler(
	campaignId: string,
	sessionId: string,
	userId: string,
): Promise<CancelSessionResult> {
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
			error: "Seule une session planifiée peut être annulée",
		};
	}

	const isCreator = session.campaign.creatorId === userId;
	const isAdmin = session.campaign.members.some((m) => m.role === "ADMIN");

	if (!isCreator && !isAdmin) {
		return {
			success: false,
			error: "Seul le créateur ou un admin peut annuler une session",
		};
	}

	await prisma.campaignSessions.update({
		where: { id: sessionId },
		data: { status: "CANCELLED" },
	});

	return { success: true };
}
