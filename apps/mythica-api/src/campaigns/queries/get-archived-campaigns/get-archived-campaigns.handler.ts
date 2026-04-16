import { prisma } from "../../../lib/prisma";
import {
	type CampaignListItem,
	campaignListSelect,
} from "../../public-campaign.select";
import type { GetArchivedCampaignsQuery } from "./get-archived-campaigns.dto";

export type GetArchivedCampaignsResult = {
	success: true;
	campaigns: CampaignListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

/**
 * Query : liste des campagnes archivées de l'utilisateur avec pagination.
 */
export async function getArchivedCampaignsHandler(
	userId: string,
	query: GetArchivedCampaignsQuery,
): Promise<GetArchivedCampaignsResult> {
	const { page, limit } = query;
	const skip = (page - 1) * limit;

	const whereCondition = {
		status: "ARCHIVED" as const,
		OR: [{ creatorId: userId }, { members: { some: { userId } } }],
	};

	const [campaigns, total] = await Promise.all([
		prisma.campaigns.findMany({
			where: whereCondition,
			skip,
			take: limit,
			orderBy: { updatedAt: "desc" },
			select: campaignListSelect,
		}),
		prisma.campaigns.count({ where: whereCondition }),
	]);

	return {
		success: true,
		campaigns,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}
