import { prisma } from "../../../lib/prisma";
import {
	type PublicCampaign,
	publicCampaignSelect,
} from "../../public-campaign.select";

export type GetCampaignByIdResult =
	| { success: true; campaign: PublicCampaign }
	| { success: false; error: string };

/**
 * Query : récupère une campagne par son ID.
 * L'utilisateur doit être membre ou la campagne doit être publique.
 */
export async function getCampaignByIdHandler(
	campaignId: string,
	userId?: string,
): Promise<GetCampaignByIdResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: publicCampaignSelect,
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	// Vérifier l'accès : campagne publique OU utilisateur est créateur/membre
	const isPublic = campaign.visibility === "PUBLIC";
	const isCreator = campaign.creatorId === userId;
	const isMember = campaign.members.some(
		(m: { userId: string }) => m.userId === userId,
	);

	if (!isPublic && !isCreator && !isMember) {
		return { success: false, error: "Accès non autorisé à cette campagne" };
	}

	return { success: true, campaign };
}
