import Redis from "ioredis";
import { env } from "../env";
import { logger } from "../logger";

function createRedis(): Redis {
	const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
	client.on("error", (err) => {
		logger.error({ err }, "Redis connection error");
	});
	return client;
}

export const redis = createRedis();
