import { redis } from "./redis";

const STREAM_KEY = "mythica:events:users";

export type UserEventType = "user.created" | "user.updated" | "user.deleted";

/**
 * Publie un événement utilisateur sur le Redis Stream.
 * Les services abonnés (gameplay, mobile, etc.) consomment ce stream.
 *
 * `fields` transporte des attributs additionnels (ex: `pseudo`) que les miroirs
 * légers des autres services peuvent stocker.
 */
export async function publishUserEvent(
	type: UserEventType,
	userId: string,
	fields: Record<string, string> = {},
): Promise<void> {
	const entries = [
		"type",
		type,
		"userId",
		userId,
		"createdAt",
		new Date().toISOString(),
	];
	for (const [key, value] of Object.entries(fields)) {
		entries.push(key, value);
	}
	await redis.xadd(STREAM_KEY, "*", ...entries);
}
