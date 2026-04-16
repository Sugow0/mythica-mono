import "dotenv/config";
import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForRedis = globalThis as unknown as { redis: Redis };

function createRedis(): Redis {
	const client = new Redis(url, { maxRetriesPerRequest: null });
	client.on("error", (err) => {
		console.error("[ioredis] Connexion Redis:", err.message);
	});
	return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
