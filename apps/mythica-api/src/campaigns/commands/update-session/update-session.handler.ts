import { prisma } from "../../../lib/prisma";
import type { UpdateSessionBody } from "./update-session.dto";

export type UpdateSessionResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : modifie une session existante.
 * Seul le créateur ou un admin peut modifier une session.
 */
export async function updateSessionHandler(
	campaignId: string,
	sessionId: string,
	userId: string,
	body: UpdateSessionBody,
): Promise<UpdateSessionResult> {
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
			error: "Seule une session planifiée peut être modifiée",
		};
	}

	const isCreator = session.campaign.creatorId === userId;
	const isAdmin = session.campaign.members.some((m) => m.role === "ADMIN");

	if (!isCreator && !isAdmin) {
		return {
			success: false,
			error: "Seul le créateur ou un admin peut modifier une session",
		};
	}

	await prisma.campaignSessions.update({
		where: { id: sessionId },
		data: body,
	});

	return { success: true };
}
