import { prisma } from "../../../lib/prisma";
import type { UpdateCharacterBody } from "./update-character.dto";

export type UpdateCharacterResult =
	| { success: true; message: string }
	| { success: false; error: string };

/**
 * Command : mettre à jour nom, isActive ou campaignId d'une fiche.
 * Seul le propriétaire ou un admin de la campagne peut modifier.
 */
export async function updateCharacterHandler(
	characterId: string,
	userId: string,
	body: UpdateCharacterBody,
): Promise<UpdateCharacterResult> {
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
		data: {
			...(body.name !== undefined && { name: body.name }),
			...(body.isActive !== undefined && { isActive: body.isActive }),
			...(body.campaignId !== undefined && { campaignId: body.campaignId }),
		},
	});

	return { success: true, message: "Fiche mise à jour" };
}
