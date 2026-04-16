import { prisma } from "../../../lib/prisma";
import type { InviteMemberBody } from "./invite-member.dto";

export type InviteMemberResult =
	| { success: true; invitationId: string }
	| { success: false; error: string };

/**
 * Command : inviter un utilisateur à rejoindre une campagne.
 * Seul le créateur ou un admin peut inviter des membres.
 * Crée une invitation en attente que l'utilisateur peut accepter ou refuser.
 */
export async function inviteMemberHandler(
	campaignId: string,
	userId: string,
	body: InviteMemberBody,
): Promise<InviteMemberResult> {
	const campaign = await prisma.campaigns.findUnique({
		where: { id: campaignId },
		select: {
			creatorId: true,
			status: true,
			members: {
				select: { userId: true, role: true },
			},
		},
	});

	if (!campaign) {
		return { success: false, error: "Campagne introuvable" };
	}

	const isCreator = campaign.creatorId === userId;
	const isAdmin = campaign.members.some(
		(m) => m.userId === userId && m.role === "ADMIN",
	);

	if (!isCreator && !isAdmin) {
		return {
			success: false,
			error: "Seul le créateur ou un admin peut inviter des membres",
		};
	}

	if (campaign.status === "ARCHIVED") {
		return {
			success: false,
			error: "Impossible d'inviter dans une campagne archivée",
		};
	}

	if (body.userId === campaign.creatorId) {
		return { success: false, error: "Le créateur est déjà dans la campagne" };
	}

	// Vérifier si l'utilisateur est déjà membre
	const isMember = campaign.members.some((m) => m.userId === body.userId);
	if (isMember) {
		return {
			success: false,
			error: "Cet utilisateur est déjà membre de la campagne",
		};
	}

	// Vérifier que l'utilisateur cible existe
	const targetUser = await prisma.users.findUnique({
		where: { id: body.userId },
		select: { id: true },
	});

	if (!targetUser) {
		return { success: false, error: "Utilisateur introuvable" };
	}

	// Vérifier s'il y a déjà une invitation en attente
	const existingInvitation = await prisma.campaignInvitations.findUnique({
		where: {
			campaignId_userId: {
				campaignId,
				userId: body.userId,
			},
		},
		select: { status: true },
	});

	if (existingInvitation) {
		if (existingInvitation.status === "PENDING") {
			return {
				success: false,
				error: "Une invitation est déjà en attente pour cet utilisateur",
			};
		}
		// Si une invitation existe mais a été refusée, la mettre à jour
		const invitation = await prisma.campaignInvitations.update({
			where: {
				campaignId_userId: {
					campaignId,
					userId: body.userId,
				},
			},
			data: {
				status: "PENDING",
				invitedBy: userId,
			},
			select: { id: true },
		});
		return { success: true, invitationId: invitation.id };
	}

	// Créer une nouvelle invitation
	const invitation = await prisma.campaignInvitations.create({
		data: {
			campaignId,
			userId: body.userId,
			invitedBy: userId,
			status: "PENDING",
		},
		select: { id: true },
	});

	return { success: true, invitationId: invitation.id };
}
