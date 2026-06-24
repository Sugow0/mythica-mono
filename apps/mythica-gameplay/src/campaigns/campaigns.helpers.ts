import { prisma } from "../lib/prisma";

export const PRISMA_UNIQUE_VIOLATION = "P2002";

export function findActiveCampaign(id: string) {
	return prisma.campaign.findFirst({ where: { id, deletedAt: null } });
}

export async function memberRole(
	campaignId: string,
	userId: string,
): Promise<string | null> {
	const member = await prisma.campaignMember.findFirst({
		where: { campaignId, userId, leftAt: null },
	});
	return member?.role ?? null;
}

export function isGmOf(
	campaign: { ownerId: string },
	userId: string,
	role: string | null,
): boolean {
	return campaign.ownerId === userId || role === "gm";
}
