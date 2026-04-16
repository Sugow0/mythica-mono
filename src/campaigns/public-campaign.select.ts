import type { Prisma } from "../../generated/prisma/client";

/**
 * Select Prisma pour les champs publics d'une campagne.
 */
export const publicCampaignSelect = {
	id: true,
	name: true,
	description: true,
	status: true,
	visibility: true,
	image: true,
	creatorId: true,
	creator: {
		select: {
			id: true,
			pseudo: true,
			avatar: true,
		},
	},
	gameSystem: {
		select: {
			id: true,
			name: true,
			description: true,
			gameSystemVersions: {
				select: {
					id: true,
					version: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			createdAt: true,
			updatedAt: true,
		},
	},
	members: {
		select: {
			userId: true,
			user: {
				select: {
					id: true,
					pseudo: true,
					avatar: true,
				},
			},
		},
	},
	createdAt: true,
	updatedAt: true,
} as const;

export type PublicCampaign = Prisma.CampaignsGetPayload<{
	select: typeof publicCampaignSelect;
}>;

/**
 * Select minimal pour les listes de campagnes.
 */
export const campaignListSelect = {
	id: true,
	name: true,
	description: true,
	status: true,
	visibility: true,
	image: true,
	creatorId: true,
	creator: {
		select: {
			id: true,
			pseudo: true,
			avatar: true,
		},
	},
	gameSystem: {
		select: {
			id: true,
			name: true,
		},
	},
	_count: {
		select: {
			members: true,
		},
	},
	createdAt: true,
	updatedAt: true,
} as const;

export type CampaignListItem = Prisma.CampaignsGetPayload<{
	select: typeof campaignListSelect;
}>;
