import { Elysia } from "elysia";
import pkg from "../package.json";
import { redis } from "./lib/redis";

type DepStatus = "connected" | "disconnected";

async function ping(check: () => Promise<unknown>): Promise<DepStatus> {
	try {
		await check();
		return "connected";
	} catch {
		return "disconnected";
	}
}

/**
 * Health check du gateway. Vérifie Redis (utilisé pour la résolution de
 * session). Retourne 503 si la dépendance est indisponible.
 */
export const healthController = new Elysia().get("/health", async ({ set }) => {
	const cache = await ping(() => redis.ping());
	const healthy = cache === "connected";
	set.status = healthy ? 200 : 503;
	return {
		status: healthy ? "healthy" : "degraded",
		version: pkg.version,
		uptime: Math.floor(process.uptime()),
		timestamp: new Date().toISOString(),
		dependencies: { redis: cache },
	};
});
