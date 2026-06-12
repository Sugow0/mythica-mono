import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { resolveUser, USER_ID_HEADER, USER_ROLE_HEADER } from "./auth/session";
import { env } from "./env";
import { healthController } from "./health.controller";
import { logger } from "./logger";
import {
	httpRequestDuration,
	httpRequestsTotal,
	metricsController,
	normalizeRoute,
} from "./metrics";
import "./ws-proxy";

const NO_BODY_METHODS = new Set(["GET", "HEAD"]);

/**
 * CORS_URL est fourni sous forme de tableau JSON dans l'environnement
 * (ex: ["http://localhost:5173", ...]). Il faut le parser : passer la chaîne
 * brute à `cors({ origin })` empêche le plugin de matcher l'origine et donc
 * d'émettre l'en-tête Access-Control-Allow-Origin (requêtes navigateur bloquées).
 */
function parseCorsOrigins(raw: string | undefined): string[] | undefined {
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [String(parsed)];
	} catch {
		return raw.split(",").map((origin) => origin.trim());
	}
}

const CORS_URL = parseCorsOrigins(process.env.CORS_URL);

const proxy = async (request: Request, targetBase: string, prefix: string) => {
	const url = new URL(request.url);
	const targetPath = url.pathname.slice(prefix.length) || "/";
	const targetUrl = `${targetBase}${targetPath}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete("host");

	// Toujours retirer d'éventuels en-têtes d'identité entrants (anti-spoof),
	// puis injecter l'identité résolue depuis la session si authentifié.
	headers.delete(USER_ID_HEADER);
	headers.delete(USER_ROLE_HEADER);
	const user = await resolveUser(request);
	if (user) {
		headers.set(USER_ID_HEADER, user.id);
		if (user.role) {
			headers.set(USER_ROLE_HEADER, user.role);
		}
	}

	const response = await fetch(targetUrl, {
		method: request.method,
		headers,
		body: NO_BODY_METHODS.has(request.method) ? undefined : request.body,
		redirect: "manual",
	});

	// Forward redirects (3xx) as-is so the browser receives Set-Cookie headers
	// (oauth_state, oauth_code_verifier) before following the redirect to Google.
	if (response.status >= 300 && response.status < 400) {
		return new Response(null, {
			status: response.status,
			headers: response.headers,
		});
	}

	return response;
};

const app = new Elysia()
	.onRequest(({ store }) => {
		(store as Record<string, unknown>).startTime = performance.now();
	})
	.onAfterResponse(({ request, store, set }) => {
		const responseTime =
			performance.now() -
			(((store as Record<string, unknown>).startTime as number) ?? 0);
		const route = normalizeRoute(new URL(request.url).pathname);
		const status = String(set.status ?? 200);
		httpRequestsTotal.inc({ method: request.method, route, status });
		httpRequestDuration.observe(
			{ method: request.method, route, status },
			responseTime / 1000,
		);
		logger.info(
			{ method: request.method, url: request.url, responseTime, status },
			"request completed",
		);
	})
	.onError(({ request, error, code }) => {
		logger.error(
			{ method: request.method, url: request.url, code, err: error },
			"request error",
		);
	})
	.use(
		cors({
			origin: CORS_URL,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			exposeHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.use(healthController)
	.use(metricsController)
	.all("/api/*", ({ request }) => proxy(request, env.API_URL, "/api"))
	.all("/gameplay/*", ({ request }) =>
		proxy(request, env.GAMEPLAY_URL, "/gameplay"),
	)
	.get("/", () => ({ status: "ok", gateway: "mythica-gateway" }))
	.listen(env.PORT);

logger.info(
	`Gateway running at http://${app.server?.hostname}:${app.server?.port}`,
);
