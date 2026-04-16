import { prisma } from "../../../lib/prisma";

export type KickMemberResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : expulser un membre d'une campagne.
 * Seul le créateur peut expulser un membre.
 */
export async function kickMemberHandler(
	campaignId: string,
	userId: string,
	targetUserId: string,
): Promise<KickMemberResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: {
			creatorId: true,
			members: {
				where: { userId: targetUserId },
				select: { userId: true },
			},
		},
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.creatorId !== userId) {
		return {
			success: false,
			error: "Seul le créateur peut expulser des membres",
		};
	}

	if (targetUserId === userId) {
		return {
			success: false,
			error: "Vous ne pouvez pas vous expulser vous-même",
		};
	}

	if (campaign.members.length === 0) {
		return {
			success: false,
			error: "Cet utilisateur n'est pas membre de la campagne",
		};
	}

	await prisma.campaignMembers.delete({
		where: {
			campaignId_userId: {
				campaignId,
				userId: targetUserId,
			},
		},
	});

	return { success: true };
}
