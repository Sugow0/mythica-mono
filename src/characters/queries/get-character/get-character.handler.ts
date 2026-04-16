import { prisma } from "../../../lib/prisma";
import {
	type PublicCharacter,
	publicCharacterSelect,
} from "../../public-character.select";

export type GetCharacterResult =
	| { success: true; character: PublicCharacter }
	| { success: false; error: string };

/**
 * Query : récupère une fiche de personnage par son ID.
 * Vérifie que l'utilisateur est propriétaire ou membre de la campagne.
 */
export async function getCharacterHandler(
	characterId: string,
	userId: string,
): Promise<GetCharacterResult> {
	const character = await prisma.characters.findUnique({
		where: { id: characterId },
		select: publicCharacterSelect,
	});

	if (!character) {
		return { success: false, error: "Fiche introuvable" };
	}

	// Propriétaire de la fiche
	if (character.userId === userId) {
		return { success: true, character };
	}

	// Membre de la campagne
	if (character.campaignId) {
		const membership = await prisma.campaignMembers.findUnique({
			where: {
				campaignId_userId: {
					campaignId: character.campaignId,
					userId,
				},
			},
			select: { userId: true },
		});

		const campaign = await prisma.campaigns.findUnique({
			where: { id: character.campaignId },
			select: { creatorId: true },
		});

		if (membership || campaign?.creatorId === userId) {
			return { success: true, character };
		}
	}

	return { success: false, error: "Accès non autorisé" };
}
