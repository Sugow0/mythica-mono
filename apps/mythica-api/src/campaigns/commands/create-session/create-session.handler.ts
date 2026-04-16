import { prisma } from "../../../lib/prisma";
import type { CreateSessionBody } from "./create-session.dto";

export type CreateSessionResult =
	| { success: true; sessionId: string }
	| { success: false; error: string };

/**
 * Command : planifie une nouvelle session pour une campagne.
 * Seul le créateur ou un admin peut planifier une session.
 */
export async function createSessionHandler(
	campaignId: string,
	userId: string,
	body: CreateSessionBody,
): Promise<CreateSessionResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: {
			creatorId: true,
			status: true,
			members: {
				where: { userId },
				select: { role: true },
			},
		},
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.status === "ARCHIVED") {
		return {
			success: false,
			error: "Impossible de planifier une session pour une campagne archivée",
		};
	}

	const isCreator = campaign.creatorId === userId;
	const isAdmin = campaign.members.some((m) => m.role === "ADMIN");

	if (!isCreator && !isAdmin) {
		return {
			success: false,
			error: "Seul le créateur ou un admin peut planifier une session",
		};
	}

	const session = await prisma.campaignSessions.create({
		data: {
			campaignId,
			title: body.title,
			description: body.description,
			scheduledAt: body.scheduledAt,
			duration: body.duration,
			status: "SCHEDULED",
		},
		select: { id: true },
	});

	return { success: true, sessionId: session.id };
}
