import { Elysia } from "elysia";
import {
	Counter,
	collectDefaultMetrics,
	Histogram,
	Registry,
} from "prom-client";

/**
 * Registre Prometheus du gateway. Le gateway est le point d'entrée unique du
 * trafic : l'instrumenter ici donne une vue centralisée (requêtes, latence,
 * erreurs) sans dupliquer l'instrumentation dans chaque service en aval.
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry }); // CPU, mémoire, event loop...

export const httpRequestsTotal = new Counter({
	name: "http_requests_total",
	help: "Nombre total de requêtes HTTP traitées par le gateway",
	labelNames: ["method", "route", "status"],
	registers: [registry],
});

export const httpRequestDuration = new Histogram({
	name: "http_request_duration_seconds",
	help: "Durée des requêtes HTTP en secondes",
	labelNames: ["method", "route", "status"],
	buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
	registers: [registry],
});

/** Normalise le chemin en quelques routes pour éviter l'explosion de cardinalité. */
export function normalizeRoute(pathname: string): string {
	if (pathname.startsWith("/api")) return "/api/*";
	if (pathname.startsWith("/gameplay")) return "/gameplay/*";
	if (pathname === "/health") return "/health";
	if (pathname === "/metrics") return "/metrics";
	return "/";
}

export const metricsController = new Elysia().get(
	"/metrics",
	async ({ set }) => {
		set.headers["content-type"] = registry.contentType;
		return registry.metrics();
	},
);
