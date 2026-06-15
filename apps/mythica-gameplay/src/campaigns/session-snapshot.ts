import { prisma } from "../lib/prisma";

/** Message de chat tel qu'inclus dans le snapshot initial. */
export type SnapshotMessage = {
	id: string;
	userId: string;
	content: string;
	createdAt: Date;
	user: { pseudo: string | null };
};

/**
 * État initial complet d'une session, envoyé à un client dès sa connexion
 * WebSocket pour qu'il se synchronise sans requête supplémentaire.
 */
export type SessionSnapshot = {
	type: "snapshot";
	participants: string[];
	mapState: unknown;
	activeTurn: string | null;
	messages: SnapshotMessage[];
};

/** Nombre de messages de chat inclus dans le snapshot. */
export const SNAPSHOT_CHAT_LIMIT = 50;

/**
 * Construit le snapshot d'une session : participants présents (fournis par
 * l'appelant), état de la carte, tour actif et historique de chat (50 derniers
 * messages, ordre chronologique). Retourne null si la session n'existe pas.
 */
export async function buildSessionSnapshot(
	sessionId: string,
	participants: string[],
): Promise<SessionSnapshot | null> {
	const session = await prisma.session.findUnique({
		where: { id: sessionId },
	});
	if (!session) return null;

	const messages = await prisma.message.findMany({
		where: { campaignId: session.campaignId },
		orderBy: { createdAt: "desc" },
		take: SNAPSHOT_CHAT_LIMIT,
		include: { user: { select: { pseudo: true } } },
	});

	const combat = (session.combatState ?? {}) as { activeTurn?: string | null };

	return {
		type: "snapshot",
		participants,
		mapState: session.mapState,
		activeTurn: combat.activeTurn ?? null,
		// findMany trie du plus récent au plus ancien : on rétablit l'ordre chrono.
		messages: (messages as SnapshotMessage[]).reverse(),
	};
}
