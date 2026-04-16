import { prisma } from "../../../lib/prisma";

export type DeleteCampaignResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : supprime une campagne.
 * Seul le créateur peut supprimer la campagne.
 */
export async function deleteCampaignHandler(
	campaignId: string,
	userId: string,
): Promise<DeleteCampaignResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: { creatorId: true },
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.creatorId !== userId) {
		return {
			success: false,
			error: "Seul le créateur peut supprimer la campagne",
		};
	}

	await prisma.campaigns.delete({
		where: { id: campaignId },
	});

	return { success: true };
}
