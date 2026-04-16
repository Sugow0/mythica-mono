import { prisma } from "../../../lib/prisma";
import type { UpdateCharacterDataBody } from "./update-character-data.dto";

export type UpdateCharacterDataResult =
	| { success: true; message: string }
	| { success: false; error: string };

/**
 * Command : remplacer intégralement le JSONB data d'une fiche.
 * Seul le propriétaire ou un admin de la campagne peut modifier.
 */
export async function updateCharacterDataHandler(
	characterId: string,
	userId: string,
	body: UpdateCharacterDataBody,
): Promise<UpdateCharacterDataResult> {
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

	await prisma.characters.update({
		where: { id: characterId },
		data: { data: body.data },
	});

	return { success: true, message: "Données de la fiche mises à jour" };
}
