import { prisma } from "../../../lib/prisma";
import {
	type CampaignListItem,
	campaignListSelect,
} from "../../public-campaign.select";
import type { SearchCampaignsQuery } from "./search-campaigns.dto";

export type SearchCampaignsResult = {
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
 * Query : recherche de campagnes publiques par nom ou description.
 */
export async function searchCampaignsHandler(
	query: SearchCampaignsQuery,
): Promise<SearchCampaignsResult> {
	const { search, page, limit } = query;
	const skip = (page - 1) * limit;

	const whereCondition = {
		visibility: "PUBLIC" as const,
		status: { not: "ARCHIVED" as const },
		OR: [
			{ name: { contains: search, mode: "insensitive" as const } },
			{ description: { contains: search, mode: "insensitive" as const } },
		],
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
