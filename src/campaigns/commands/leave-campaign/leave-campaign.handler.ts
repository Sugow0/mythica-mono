import { prisma } from "../../../lib/prisma";

export type LeaveCampaignResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : quitter une campagne.
 * Le créateur ne peut pas quitter sa propre campagne.
 */
export async function leaveCampaignHandler(
	campaignId: string,
	userId: string,
): Promise<LeaveCampaignResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: {
			creatorId: true,
			members: {
				where: { userId },
				select: { userId: true },
			},
		},
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.creatorId === userId) {
		return {
			success: false,
			error: "Le créateur ne peut pas quitter sa propre campagne",
		};
	}

	if (campaign.members.length === 0) {
		return {
			success: false,
			error: "Vous n'êtes pas membre de cette campagne",
		};
	}

	await prisma.campaignMembers.delete({
		where: {
			campaignId_userId: {
				campaignId,
				userId,
			},
		},
	});

	return { success: true };
}
