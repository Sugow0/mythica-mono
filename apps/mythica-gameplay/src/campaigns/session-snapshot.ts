import { prisma } from "../lib/prisma";

/** Message de chat tel qu'inclus dans le snapshot initial. */
export type SnapshotMessage = {
	id: string;
	userId: string;
	content: string;
	createdAt: Date;
	user: { pseudo: string | null };
};

/** Token de session tel qu'inclus dans le snapshot initial. */
export type SnapshotToken = {
	id: string;
	sessionId: string;
	characterSheetId: string | null;
	label: string | null;
	fileId: string | null;
	posX: string;
	posY: string;
	width: number;
	height: number;
	isVisible: boolean;
	layer: string;
};

/**
 * État initial complet d'une session, envoyé à un client dès sa connexion
 * WebSocket pour qu'il se synchronise sans requête supplémentaire.
 */
export type SessionSnapshot = {
	type: "snapshot";
	participants: string[];
	activeMap: unknown | null;
	mapState: unknown;
	tokens: SnapshotToken[];
	walls: unknown[];
	activeTurn: string | null;
	combatState: unknown;
	messages: SnapshotMessage[];
};

/** Nombre de messages de chat inclus dans le snapshot. */
export const SNAPSHOT_CHAT_LIMIT = 50;

/**
 * Construit le snapshot d'une session : participants présents (fournis par
 * l'appelant), carte active, tokens, état de la carte, tour actif, état du
 * combat et historique de chat (50 derniers messages, ordre chronologique).
 * Retourne null si la session n'existe pas.
 */
export async function buildSessionSnapshot(
	sessionId: string,
	participants: string[],
): Promise<SessionSnapshot | null> {
	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { activeMap: true },
	});
	if (!session) return null;

	const [messages, tokens, walls] = await Promise.all([
		prisma.message.findMany({
			where: { campaignId: session.campaignId },
			orderBy: { createdAt: "desc" },
			take: SNAPSHOT_CHAT_LIMIT,
			include: { user: { select: { pseudo: true } } },
		}),
		prisma.sessionToken.findMany({
			where: { sessionId },
			orderBy: { createdAt: "asc" },
		}),
		prisma.sessionWall.findMany({
			where: { sessionId },
			orderBy: { createdAt: "asc" },
		}),
	]);

	return {
		type: "snapshot",
		participants,
		activeMap: session.activeMap ?? null,
		mapState: session.mapState,
		tokens: tokens as unknown as SnapshotToken[],
		walls,
		activeTurn:
			(session.combatState as { activeTurn?: string | null })?.activeTurn ??
			null,
		combatState: session.combatState,
		// findMany trie du plus récent au plus ancien : on rétablit l'ordre chrono.
		messages: (messages as unknown as SnapshotMessage[]).reverse(),
	};
}
