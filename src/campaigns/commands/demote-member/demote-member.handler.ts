import { prisma } from "../../../lib/prisma";

export type DemoteMemberResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : rétrograder un admin au rôle de membre.
 * Seul le créateur peut rétrograder un admin.
 */
export async function demoteMemberHandler(
	campaignId: string,
	userId: string,
	targetUserId: string,
): Promise<DemoteMemberResult> {
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
			error: "Seul le créateur peut rétrograder des admins",
		};
	}

	if (targetUserId === userId) {
		return {
			success: false,
			error: "Vous ne pouvez pas vous rétrograder vous-même",
		};
	}

	if (campaign.members.length === 0) {
		return {
			success: false,
			error: "Cet utilisateur n'est pas membre de la campagne",
		};
	}

	if (campaign.members[0].role === "MEMBER") {
		return { success: false, error: "Cet utilisateur n'est pas admin" };
	}

	await prisma.campaignMembers.update({
		where: {
			campaignId_userId: {
				campaignId,
				userId: targetUserId,
			},
		},
		data: { role: "MEMBER" },
	});

	return { success: true };
}
