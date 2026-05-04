import { redis } from "./redis";

const STREAM_KEY = "mythica:events:users";

export type UserEventType = "user.created" | "user.deleted";

/**
 * Publie un événement utilisateur sur le Redis Stream.
 * Les services abonnés (gameplay, mobile, etc.) consomment ce stream.
 */
export async function publishUserEvent(
	type: UserEventType,
	userId: string,
): Promise<void> {
	await redis.xadd(
		STREAM_KEY,
		"*", // ID auto-généré par Redis (timestamp + séquence)
		"type", type,
		"userId", userId,
		"createdAt", new Date().toISOString(),
	);
}
