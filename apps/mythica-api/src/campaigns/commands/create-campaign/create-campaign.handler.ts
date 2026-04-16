import { prisma } from "../../../lib/prisma";
import type { CreateCampaignBody } from "./create-campaign.dto";

export type CreateCampaignResult =
	| { success: true; campaignId: string }
	| { success: false; error: string };

/**
 * Command : crée une nouvelle campagne.
 */
export async function createCampaignHandler(
	userId: string,
	body: CreateCampaignBody,
): Promise<CreateCampaignResult> {
	const gameSystem = await prisma.gameSystems.findUnique({
		where: { id: body.gameSystemId },
		select: { id: true },
	});

	if (!gameSystem) {
		return { success: false, error: "Système de jeu introuvable" };
	}

	const campaign = await prisma.campaigns.create({
		data: {
			name: body.name,
			description: body.description,
			visibility: body.visibility,
			status: "DRAFT",
			creatorId: userId,
			gameSystemId: body.gameSystemId,
		},
		select: { id: true },
	});

	return { success: true, campaignId: campaign.id };
}
