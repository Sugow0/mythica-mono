import { redis } from "../../../lib/redis";

/**
 * Durée de vie de la clé de présence d'une session. Garde-fou contre les clés
 * orphelines si un processus meurt sans exécuter le nettoyage de déconnexion.
 */
export const PRESENCE_TTL_SECONDS = 60 * 60;

/** Canal Redis pub/sub diffusant les changements de présence d'une session. */
export function presenceChannel(sessionId: string): string {
	return `session:${sessionId}:presence`;
}

/**
 * Clé du hash Redis recensant les connexions actives par utilisateur.
 * La valeur est un compteur de connexions (onglets) pour ne retirer un membre
 * de la présence qu'à la fermeture de son dernier flux.
 */
export function presenceKey(sessionId: string): string {
	return `session:${sessionId}:presence:members`;
}

/** Charge utile diffusée aux abonnés du flux de présence. */
export type PresencePayload = {
	users: string[];
	status?: string;
};

/** Identifiants des utilisateurs actuellement connectés à la session. */
export function listPresence(sessionId: string): Promise<string[]> {
	return redis.hkeys(presenceKey(sessionId));
}

/** Lit la liste courante puis la diffuse sur le canal de la session. */
async function publishPresence(
	sessionId: string,
	extra: Omit<PresencePayload, "users"> = {},
): Promise<string[]> {
	const users = await listPresence(sessionId);
	const payload: PresencePayload = { users, ...extra };
	await redis.publish(presenceChannel(sessionId), JSON.stringify(payload));
	return users;
}

/**
 * Enregistre une connexion de l'utilisateur à la session et diffuse la présence.
 * Incrémente le compteur de connexions (gestion des onglets multiples).
 */
export async function joinPresence(
	sessionId: string,
	userId: string,
): Promise<string[]> {
	await redis.hincrby(presenceKey(sessionId), userId, 1);
	await redis.expire(presenceKey(sessionId), PRESENCE_TTL_SECONDS);
	return publishPresence(sessionId);
}

/**
 * Retire une connexion de l'utilisateur. Ne le sort de la présence qu'une fois
 * son dernier flux fermé, puis diffuse la liste mise à jour.
 */
export async function leavePresence(
	sessionId: string,
	userId: string,
): Promise<string[]> {
	const remaining = await redis.hincrby(presenceKey(sessionId), userId, -1);
	if (remaining <= 0) {
		await redis.hdel(presenceKey(sessionId), userId);
	}
	return publishPresence(sessionId);
}

/** Diffuse un changement de statut de session aux abonnés du flux de présence. */
export async function announceStatus(
	sessionId: string,
	status: string,
): Promise<void> {
	await publishPresence(sessionId, { status });
}
