import { prisma } from "../../../lib/prisma";

export type RefuseInvitationResult =
	| { success: true }
	| { success: false; error: string };

/**
 * Command : refuser une invitation à rejoindre une campagne.
 */
export async function refuseInvitationHandler(
	campaignId: string,
	userId: string,
): Promise<RefuseInvitationResult> {
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
		},
	});

	if (!invitation) {
		return { success: false, error: "Invitation introuvable" };
	}

	if (invitation.status !== "PENDING") {
		return { success: false, error: "Cette invitation n'est plus en attente" };
	}

	await prisma.campaignInvitations.update({
		where: { id: invitation.id },
		data: { status: "REFUSED" },
	});

	return { success: true };
}
