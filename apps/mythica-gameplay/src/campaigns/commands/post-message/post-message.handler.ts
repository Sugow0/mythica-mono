import { prisma } from "../../../lib/prisma";
import { redis } from "../../../lib/redis";

/** Longueur maximale d'un message de chat. */
export const MAX_MESSAGE_LENGTH = 2000;

/** Nom du canal Redis pub/sub pour le chat d'une campagne. */
export function chatChannel(campaignId: string): string {
	return `campaign:${campaignId}:chat`;
}

export type ChatMessage = {
	id: string;
	campaignId: string;
	userId: string;
	content: string;
	createdAt: Date;
	user: { pseudo: string | null };
};

export type PostMessageInput = {
	campaignId: string;
	userId: string;
	content: string;
};

export type PostMessageResult =
	| { ok: true; message: ChatMessage }
	| { ok: false; status: 400 | 403 | 404; error: string };

/** Vrai si l'utilisateur est propriétaire ou membre actif de la campagne. */
async function isCampaignMember(
	campaignId: string,
	userId: string,
): Promise<boolean | null> {
	const campaign = await prisma.campaign.findFirst({
		where: { id: campaignId, deletedAt: null },
	});
	if (!campaign) return null;
	if (campaign.ownerId === userId) return true;
	const member = await prisma.campaignMember.findFirst({
		where: { campaignId, userId, leftAt: null },
	});
	return member !== null;
}

/**
 * Publie un message dans le chat d'une campagne.
 *
 * Réservé aux membres. Valide le contenu, persiste le message puis le diffuse
 * sur le canal Redis pub/sub de la campagne pour les abonnés SSE.
 */
export async function postMessageHandler(
	input: PostMessageInput,
): Promise<PostMessageResult> {
	const content = input.content.trim();
	if (content.length === 0) {
		return { ok: false, status: 400, error: "Message vide" };
	}
	if (content.length > MAX_MESSAGE_LENGTH) {
		return {
			ok: false,
			status: 400,
			error: `Message trop long (max. ${MAX_MESSAGE_LENGTH} caractères).`,
		};
	}

	const membership = await isCampaignMember(input.campaignId, input.userId);
	if (membership === null) {
		return { ok: false, status: 404, error: "Campagne introuvable" };
	}
	if (!membership) {
		return { ok: false, status: 403, error: "Accès refusé" };
	}

	const created = await prisma.message.create({
		data: {
			id: crypto.randomUUID(),
			campaignId: input.campaignId,
			userId: input.userId,
			content,
		},
		include: { user: { select: { pseudo: true } } },
	});

	const message: ChatMessage = {
		id: created.id,
		campaignId: created.campaignId,
		userId: created.userId,
		content: created.content,
		createdAt: created.createdAt,
		user: { pseudo: created.user?.pseudo ?? null },
	};

	await redis.publish(chatChannel(input.campaignId), JSON.stringify(message));

	return { ok: true, message };
}
