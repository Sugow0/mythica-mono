import { Elysia } from "elysia";
import pkg from "../package.json";
import { prisma } from "./lib/prisma";
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
 * Health check exposant l'état du service gameplay et de ses dépendances
 * (Postgres, Redis). Retourne 503 si une dépendance est indisponible.
 */
export const healthController = new Elysia().get(
	"/health",
	async ({ set }) => {
		const [database, cache] = await Promise.all([
			ping(() => prisma.$queryRaw`SELECT 1`),
			ping(() => redis.ping()),
		]);
		const healthy = database === "connected" && cache === "connected";
		set.status = healthy ? 200 : 503;
		return {
			status: healthy ? "healthy" : "degraded",
			version: pkg.version,
			uptime: Math.floor(process.uptime()),
			timestamp: new Date().toISOString(),
			dependencies: { database, redis: cache },
		};
	},
	{ detail: { tags: ["App"], summary: "Health check du service" } },
);
