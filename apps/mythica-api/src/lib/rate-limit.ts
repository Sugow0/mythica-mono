import { redis } from "./redis";

const LOGIN_RATE_PREFIX = "ratelimit:login:";
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SEC = 30 * 60; // 30 min

export type RateLimitResult =
	| { allowed: true }
	| { allowed: false; retryAfterSec: number };

/**
 * Vérifie et incrémente le compteur de tentatives de login pour une clé (ex. IP).
 * 5 tentatives max sur 30 min.
 */
export async function checkLoginRateLimit(
	key: string,
): Promise<RateLimitResult> {
	const redisKey = `${LOGIN_RATE_PREFIX}${key}`;
	const count = await redis.incr(redisKey);
	if (count === 1) await redis.expire(redisKey, LOGIN_WINDOW_SEC);
	const ttl = await redis.ttl(redisKey);
	if (count > LOGIN_MAX_ATTEMPTS) {
		return { allowed: false, retryAfterSec: Math.max(0, ttl) };
	}
	return { allowed: true };
}
