import type { Prisma } from "../../generated/prisma/client";

/**
 * Select Prisma pour les champs publics complets d'une fiche (avec data JSONB).
 */
export const publicCharacterSelect = {
	id: true,
	name: true,
	type: true,
	isActive: true,
	data: true,
	userId: true,
	campaignId: true,
	user: {
		select: {
			id: true,
			pseudo: true,
			avatar: true,
		},
	},
	createdAt: true,
	updatedAt: true,
} as const;

export type PublicCharacter = Prisma.CharactersGetPayload<{
	select: typeof publicCharacterSelect;
}>;

/**
 * Select minimal pour les listes (sans data JSONB).
 */
export const minimalCharacterSelect = {
	id: true,
	name: true,
	type: true,
	isActive: true,
	userId: true,
	campaignId: true,
	user: {
		select: {
			id: true,
			pseudo: true,
			avatar: true,
		},
	},
	createdAt: true,
	updatedAt: true,
} as const;

export type MinimalCharacter = Prisma.CharactersGetPayload<{
	select: typeof minimalCharacterSelect;
}>;
