import { prisma } from "../../../lib/prisma";

export type DeactivateCharacterResult =
	| { success: true; message: string }
	| { success: false; error: string };

/**
 * Command : désactiver une fiche de personnage (isActive → false).
 * Seul le propriétaire ou un admin de la campagne peut désactiver.
 */
export async function deactivateCharacterHandler(
	characterId: string,
	userId: string,
): Promise<DeactivateCharacterResult> {
	const character = await prisma.characters.findUnique({
		where: { id: characterId },
		select: { userId: true, campaignId: true, isActive: true },
	});

	if (!character) {
		return { success: false, error: "Fiche introuvable" };
	}

	if (!character.isActive) {
		return { success: false, error: "La fiche est déjà inactive" };
	}

	const isOwner = character.userId === userId;

	if (!isOwner && character.campaignId) {
		const campaign = await prisma.campaigns.findUnique({
			where: { id: character.campaignId },
			select: {
				creatorId: true,
				members: { select: { userId: true, role: true } },
			},
		});

		const isCreator = campaign?.creatorId === userId;
		const isAdmin = campaign?.members.some(
			(m) => m.userId === userId && m.role === "ADMIN",
		);

		if (!isCreator && !isAdmin) {
			return { success: false, error: "Accès non autorisé" };
		}
	} else if (!isOwner) {
		return { success: false, error: "Accès non autorisé" };
	}

	await prisma.characters.update({
		where: { id: characterId },
		data: { isActive: false },
	});

	return { success: true, message: "Fiche désactivée" };
}
