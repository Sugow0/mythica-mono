import { prisma } from "../../../lib/prisma";

export type PromoteMemberResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : promouvoir un membre au rôle d'admin.
 * Seul le créateur peut promouvoir un membre.
 */
export async function promoteMemberHandler(
	campaignId: string,
	userId: string,
	targetUserId: string,
): Promise<PromoteMemberResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: {
			creatorId: true,
			members: {
				where: { userId: targetUserId },
				select: { userId: true, role: true },
			},
		},
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	if (campaign.creatorId !== userId) {
		return {
			success: false,
			error: "Seul le créateur peut promouvoir des membres",
		};
	}

	if (targetUserId === userId) {
		return {
			success: false,
			error: "Vous ne pouvez pas vous promouvoir vous-même",
		};
	}

	if (campaign.members.length === 0) {
		return {
			success: false,
			error: "Cet utilisateur n'est pas membre de la campagne",
		};
	}

	if (campaign.members[0].role === "ADMIN") {
		return { success: false, error: "Cet utilisateur est déjà admin" };
	}

	await prisma.campaignMembers.update({
		where: {
			campaignId_userId: {
				campaignId,
				userId: targetUserId,
			},
		},
		data: { role: "ADMIN" },
	});

	return { success: true };
}
