import { prisma } from "../../../lib/prisma";

export type DeleteCharacterResult =
	| { success: true; message: string }
	| { success: false; error: string };

/**
 * Command : supprimer définitivement une fiche de personnage.
 * Seul le propriétaire ou un admin de la campagne peut supprimer.
 */
export async function deleteCharacterHandler(
	characterId: string,
	userId: string,
): Promise<DeleteCharacterResult> {
	const character = await prisma.characters.findUnique({
		where: { id: characterId },
		select: { userId: true, campaignId: true },
	});

	if (!character) {
		return { success: false, error: "Fiche introuvable" };
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

	await prisma.characters.delete({ where: { id: characterId } });

	return { success: true, message: "Fiche supprimée" };
}
