import Redis from "ioredis";
import { env } from "../env";

function createRedis(): Redis {
	const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
	client.on("error", (err) => {
		console.error("[ioredis] Erreur Redis:", err.message);
	});
	return client;
}

// Client dédié aux opérations standard (XADD, GET, SET...)
export const redis = createRedis();

// Client dédié au consumer (XREADGROUP est bloquant, ne peut pas partager la connexion)
export const redisConsumer = createRedis();
