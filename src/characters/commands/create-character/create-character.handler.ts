import { prisma } from "../../../lib/prisma";
import type { CreateCharacterBody } from "./create-character.dto";

export type CreateCharacterResult =
	| { success: true; characterId: string }
	| { success: false; error: string };

/**
 * Command : créer une fiche de personnage.
 * - Un joueur ne peut avoir qu'une fiche PLAYER active par campagne.
 * - Seul le créateur ou admin d'une campagne peut créer des NPCs.
 */
export async function createCharacterHandler(
	userId: string,
	body: CreateCharacterBody,
): Promise<CreateCharacterResult> {
	const type = body.type ?? "PLAYER";

	if (body.campaignId) {
		const campaign = await prisma.campaigns.findUnique({
			where: { id: body.campaignId },
			select: {
				creatorId: true,
				members: { select: { userId: true, role: true } },
			},
		});

		if (!campaign) {
			return { success: false, error: "Campagne introuvable" };
		}

		const isCreator = campaign.creatorId === userId;
		const isAdmin = campaign.members.some(
			(m) => m.userId === userId && m.role === "ADMIN",
		);
		const isMember = campaign.members.some((m) => m.userId === userId);

		// Seul créateur/admin peut créer des NPCs
		if (type === "NPC" && !isCreator && !isAdmin) {
			return {
				success: false,
				error: "Seul le créateur ou un admin peut créer des NPCs",
			};
		}

		// Le joueur doit être dans la campagne pour créer un PLAYER
		if (type === "PLAYER" && !isCreator && !isMember) {
			return {
				success: false,
				error: "Vous devez être membre de la campagne",
			};
		}

		// Vérifier la contrainte 1 fiche PLAYER active max par campagne
		if (type === "PLAYER") {
			const existing = await prisma.characters.findFirst({
				where: {
					campaignId: body.campaignId,
					userId,
					type: "PLAYER",
					isActive: true,
				},
				select: { id: true },
			});

			if (existing) {
				return {
					success: false,
					error: "Vous avez déjà une fiche PLAYER active dans cette campagne",
				};
			}
		}
	}

	const character = await prisma.characters.create({
		data: {
			name: body.name,
			type,
			data: body.data ?? {},
			campaignId: body.campaignId ?? null,
			userId: type === "PLAYER" ? userId : null,
		},
		select: { id: true },
	});

	return { success: true, characterId: character.id };
}
