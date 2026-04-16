import { prisma } from "../../../lib/prisma";

export type AcceptInvitationResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : accepter une invitation à rejoindre une campagne.
 * L'utilisateur invité accepte et devient membre de la campagne.
 */
export async function acceptInvitationHandler(
	campaignId: string,
	userId: string,
): Promise<AcceptInvitationResult> {
	const invitation = await prisma.campaignInvitations.findUnique({
		where: {
			campaignId_userId: {
				campaignId,
				userId,
			},
		},
		select: {
			id: true,
			status: true,
			campaign: {
				select: {
					status: true,
				},
			},
		},
	});

	if (!invitation) {
		return { success: false, error: "Invitation introuvable" };
	}

	if (invitation.status !== "PENDING") {
		return { success: false, error: "Cette invitation n'est plus en attente" };
	}

	if (invitation.campaign.status === "ARCHIVED") {
		return { success: false, error: "Cette campagne est archivée" };
	}

	// Transaction : mettre à jour l'invitation et ajouter le membre
	await prisma.$transaction([
		prisma.campaignInvitations.update({
			where: { id: invitation.id },
			data: { status: "ACCEPTED" },
		}),
		prisma.campaignMembers.create({
			data: {
				campaignId,
				userId,
				role: "MEMBER",
			},
		}),
	]);

	return { success: true };
}
