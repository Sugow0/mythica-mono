import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Health check du front (consommé par le HEALTHCHECK Docker et le monitoring).
 */
export const GET: RequestHandler = () =>
	json({
		status: "healthy",
		uptime: Math.floor(process.uptime()),
		timestamp: new Date().toISOString(),
	});
