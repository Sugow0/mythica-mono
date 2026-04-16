import { prisma } from "../../../lib/prisma";
import {
	type CampaignListItem,
	campaignListSelect,
} from "../../public-campaign.select";
import type { GetCampaignsQuery } from "./get-campaigns.dto";

export type GetCampaignsResult = {
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
 * Query : liste des campagnes publiques avec pagination.
 */
export async function getCampaignsHandler(
	query: GetCampaignsQuery,
): Promise<GetCampaignsResult> {
	const { page, limit } = query;
	const skip = (page - 1) * limit;

	const [campaigns, total] = await Promise.all([
		prisma.campaigns.findMany({
			where: {
				visibility: "PUBLIC",
				status: { not: "ARCHIVED" },
			},
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: campaignListSelect,
		}),
		prisma.campaigns.count({
			where: {
				visibility: "PUBLIC",
				status: { not: "ARCHIVED" },
			},
		}),
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
