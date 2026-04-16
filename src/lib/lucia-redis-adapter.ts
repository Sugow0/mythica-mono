import type { Adapter, DatabaseSession, DatabaseUser } from "lucia";
import { prisma } from "./prisma";
import { redis } from "./redis";

const SESSION_PREFIX = "session:";
const USER_SESSIONS_PREFIX = "user_sessions:";

function sessionKey(id: string) {
	return `${SESSION_PREFIX}${id}`;
}

function userSessionsKey(userId: string) {
	return `${USER_SESSIONS_PREFIX}${userId}`;
}

/** Adapter Lucia : sessions dans Redis, utilisateur depuis Prisma. */
export const luciaRedisAdapter: Adapter = {
	async getSessionAndUser(
		sessionId: string,
	): Promise<[DatabaseSession | null, DatabaseUser | null]> {
		const raw = await redis.get(sessionKey(sessionId));
		if (!raw) return [null, null];
		const data = JSON.parse(raw) as {
			userId: string;
			expiresAt: number;
			attributes: Record<string, unknown>;
		};
		const session: DatabaseSession = {
			id: sessionId,
			userId: data.userId,
			expiresAt: new Date(data.expiresAt),
			attributes: data.attributes ?? {},
		};
		const user = await prisma.users.findUnique({ where: { id: data.userId } });
		if (!user) return [session, null];
		const databaseUser: DatabaseUser = {
			id: user.id,
			attributes: {
				email: user.email,
				password: user.password ?? "",
				pseudo: user.pseudo,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				avatar: user.avatar,
				emailVerified: user.emailVerified,
				emailVerifiedAt: user.emailVerifiedAt,
				twoFactorSecret: user.twoFactorSecret,
			},
		};
		return [session, databaseUser];
	},

	async getUserSessions(userId: string): Promise<DatabaseSession[]> {
		const ids = await redis.smembers(userSessionsKey(userId));
		if (ids.length === 0) return [];
		const sessions: DatabaseSession[] = [];
		for (const id of ids) {
			const raw = await redis.get(sessionKey(id));
			if (!raw) continue;
			const data = JSON.parse(raw) as {
				userId: string;
				expiresAt: number;
				attributes: Record<string, unknown>;
			};
			sessions.push({
				id,
				userId: data.userId,
				expiresAt: new Date(data.expiresAt),
				attributes: data.attributes ?? {},
			});
		}
		return sessions;
	},

	async setSession(session: DatabaseSession): Promise<void> {
		const ttlSec = Math.max(
			1,
			Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
		);
		const value = JSON.stringify({
			userId: session.userId,
			expiresAt: session.expiresAt.getTime(),
			attributes: session.attributes ?? {},
		});
		await redis.setex(sessionKey(session.id), ttlSec, value);
		await redis.sadd(userSessionsKey(session.userId), session.id);
	},

	async updateSessionExpiration(
		sessionId: string,
		expiresAt: Date,
	): Promise<void> {
		const raw = await redis.get(sessionKey(sessionId));
		if (!raw) return;
		const data = JSON.parse(raw) as {
			userId: string;
			attributes: Record<string, unknown>;
		};
		const ttlSec = Math.max(
			1,
			Math.floor((expiresAt.getTime() - Date.now()) / 1000),
		);
		await redis.setex(
			sessionKey(sessionId),
			ttlSec,
			JSON.stringify({ ...data, expiresAt: expiresAt.getTime() }),
		);
	},

	async deleteSession(sessionId: string): Promise<void> {
		const raw = await redis.get(sessionKey(sessionId));
		if (raw) {
			const data = JSON.parse(raw) as { userId: string };
			await redis.srem(userSessionsKey(data.userId), sessionId);
		}
		await redis.del(sessionKey(sessionId));
	},

	async deleteUserSessions(userId: string): Promise<void> {
		const ids = await redis.smembers(userSessionsKey(userId));
		if (ids.length > 0) await redis.del(...ids.map((id) => sessionKey(id)));
		await redis.del(userSessionsKey(userId));
	},

	async deleteExpiredSessions(): Promise<void> {
		// Redis expire automatiquement les clés avec TTL ; pas d'action nécessaire.
	},
};
