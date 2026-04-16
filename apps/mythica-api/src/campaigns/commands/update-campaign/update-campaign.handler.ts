import { prisma } from "../../../lib/prisma";
import type { UpdateCampaignBody } from "./update-campaign.dto";

export type UpdateCampaignResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : modifie une campagne existante.
 * Seul le créateur peut modifier la campagne.
 */
export async function updateCampaignHandler(
	campaignId: string,
	userId: string,
	body: UpdateCampaignBody,
): Promise<UpdateCampaignResult> {
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
			error: "Seul le créateur peut modifier la campagne",
		};
	}

	if (campaign.status === "ARCHIVED") {
		return {
			success: false,
			error: "Impossible de modifier une campagne archivée",
		};
	}

	if (body.gameSystemId) {
		const gameSystem = await prisma.gameSystems.findUnique({
			where: { id: body.gameSystemId },
			select: { id: true },
		});

		if (!gameSystem) {
			return { success: false, error: "Système de jeu introuvable" };
		}
	}

	await prisma.campaigns.update({
		where: { id: campaignId },
		data: body,
	});

	return { success: true };
}
