import { redis } from "../../../../lib/redis";

const PENDING_2FA_PREFIX = "pending2fa:";
const LOGIN_2FA_PREFIX = "login2fa:";
const PENDING_2FA_TTL_SEC = 600; // 10 min
const LOGIN_2FA_TTL_SEC = 300; // 5 min

export function pending2faKey(userId: string): string {
	return `${PENDING_2FA_PREFIX}${userId}`;
}

export function login2faKey(tempToken: string): string {
	return `${LOGIN_2FA_PREFIX}${tempToken}`;
}

export async function setPending2fa(
	userId: string,
	secretHex: string,
): Promise<void> {
	await redis.setex(pending2faKey(userId), PENDING_2FA_TTL_SEC, secretHex);
}

export async function getPending2fa(userId: string): Promise<string | null> {
	return redis.get(pending2faKey(userId));
}

export async function deletePending2fa(userId: string): Promise<void> {
	await redis.del(pending2faKey(userId));
}

export async function setLogin2fa(
	tempToken: string,
	userId: string,
): Promise<void> {
	await redis.setex(login2faKey(tempToken), LOGIN_2FA_TTL_SEC, userId);
}

export async function getLogin2fa(tempToken: string): Promise<string | null> {
	return redis.get(login2faKey(tempToken));
}

export async function deleteLogin2fa(tempToken: string): Promise<void> {
	await redis.del(login2faKey(tempToken));
}
