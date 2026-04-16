import { prisma } from "../../../lib/prisma";

export type ArchiveCampaignResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : archive une campagne.
 * Seul le créateur peut archiver la campagne.
 */
export async function archiveCampaignHandler(
	campaignId: string,
	userId: string,
): Promise<ArchiveCampaignResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: { creatorId: true, status: true },
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.creatorId !== userId) {
		return {
			success: false,
			error: "Seul le créateur peut archiver la campagne",
		};
	}

	if (campaign.status === "ARCHIVED") {
		return { success: false, error: "La campagne est déjà archivée" };
	}

	await prisma.campaigns.update({
		where: { id: campaignId },
		data: { status: "ARCHIVED" },
	});

	return { success: true };
}
