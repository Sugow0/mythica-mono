import { prisma } from "../../../lib/prisma";

export type JoinCampaignResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : rejoindre une campagne publique.
 */
export async function joinCampaignHandler(
	campaignId: string,
	userId: string,
): Promise<JoinCampaignResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: {
			creatorId: true,
			status: true,
			visibility: true,
			members: {
				where: { userId },
				select: { userId: true },
			},
		},
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.status === "ARCHIVED") {
		return {
			success: false,
			error: "Impossible de rejoindre une campagne archivée",
		};
	}

	if (campaign.visibility === "PRIVATE") {
		return {
			success: false,
			error: "Cette campagne est privée, vous devez être invité",
		};
	}

	if (campaign.creatorId === userId) {
		return { success: false, error: "Vous êtes le créateur de cette campagne" };
	}

	if (campaign.members.length > 0) {
		return { success: false, error: "Vous êtes déjà membre de cette campagne" };
	}

	await prisma.campaignMembers.create({
		data: {
			campaignId,
			userId,
		},
	});

	return { success: true };
}
