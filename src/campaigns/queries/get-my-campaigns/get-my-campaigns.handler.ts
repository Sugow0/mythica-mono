import { prisma } from "../../../lib/prisma";
import {
	type CampaignListItem,
	campaignListSelect,
} from "../../public-campaign.select";
import type { GetMyCampaignsQuery } from "./get-my-campaigns.dto";

export type GetMyCampaignsResult = {
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
 * Query : liste des campagnes de l'utilisateur (créées ou membre) avec pagination.
 */
export async function getMyCampaignsHandler(
	userId: string,
	query: GetMyCampaignsQuery,
): Promise<GetMyCampaignsResult> {
	const { page, limit } = query;
	const skip = (page - 1) * limit;

	const whereCondition = {
		status: { not: "ARCHIVED" as const },
		OR: [{ creatorId: userId }, { members: { some: { userId } } }],
	};

	const [campaigns, total] = await Promise.all([
		prisma.campaigns.findMany({
			where: whereCondition,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
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
