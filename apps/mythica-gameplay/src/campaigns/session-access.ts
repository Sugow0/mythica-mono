import type { CurrentUser } from "../auth/context";
import { prisma } from "../lib/prisma";

export type SessionRow = {
	id: string;
	campaignId: string;
	status: string;
	startedAt: Date | null;
};
export type CampaignRow = { id: string; nom: string; ownerId: string };

export type SessionAccess =
	| {
			ok: true;
			session: SessionRow;
			campaign: CampaignRow;
			role: string | null;
	  }
	| { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Résout la session et sa campagne, puis vérifie que l'utilisateur est membre
 * actif (ou propriétaire). Centralise les codes d'erreur partagés par les
 * routes HTTP et WebSocket d'une session.
 */
export async function resolveSessionAccess(
	sessionId: string,
	user: CurrentUser | null,
): Promise<SessionAccess> {
	if (!user) return { ok: false, status: 401, error: "Non authentifié" };

	const session = (await prisma.session.findUnique({
		where: { id: sessionId },
	})) as SessionRow | null;
	if (!session) return { ok: false, status: 404, error: "Session introuvable" };

	const campaign = (await prisma.campaign.findFirst({
		where: { id: session.campaignId, deletedAt: null },
	})) as CampaignRow | null;
	if (!campaign)
		return { ok: false, status: 404, error: "Campagne introuvable" };

	const member = await prisma.campaignMember.findFirst({
		where: { campaignId: campaign.id, userId: user.id, leftAt: null },
	});
	const role = member?.role ?? null;
	if (campaign.ownerId !== user.id && !role)
		return { ok: false, status: 403, error: "Accès refusé" };

	return { ok: true, session, campaign, role };
}

/** Vrai si l'utilisateur est propriétaire ou MJ de la campagne. */
export function isGameMaster(access: {
	campaign: CampaignRow;
	role: string | null;
}): (user: CurrentUser) => boolean {
	return (user) => access.campaign.ownerId === user.id || access.role === "gm";
}
