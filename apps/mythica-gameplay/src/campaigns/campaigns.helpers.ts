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

export type CampaignGmAccess =
	| {
			ok: true;
			campaign: NonNullable<Awaited<ReturnType<typeof findActiveCampaign>>>;
	  }
	| { ok: false; status: 404 | 403; error: string };

export async function requireCampaignGm(
	campaignId: string,
	userId: string,
): Promise<CampaignGmAccess> {
	const campaign = await findActiveCampaign(campaignId);
	if (!campaign)
		return { ok: false, status: 404, error: "Campagne introuvable" };
	const role = await memberRole(campaignId, userId);
	if (!isGmOf(campaign, userId, role)) {
		return { ok: false, status: 403, error: "Droits MJ requis" };
	}
	return { ok: true, campaign };
}
