import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "./env";
import { logger } from "./logger";
import "./ws-proxy";

const NO_BODY_METHODS = new Set(["GET", "HEAD"]);

const proxy = async (request: Request, targetBase: string, prefix: string) => {
	const url = new URL(request.url);
	const targetPath = url.pathname.slice(prefix.length) || "/";
	const targetUrl = `${targetBase}${targetPath}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete("host");

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
	.onAfterResponse(({ request, store }) => {
		const responseTime =
			performance.now() - (((store as Record<string, unknown>).startTime as number) ?? 0);
		logger.info(
			{ method: request.method, url: request.url, responseTime },
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
			origin: [
				"http://localhost:3000",
				"http://localhost:5173",
				"https://api.staging.mythica.tengram.fr",
				"https://api.mythica.tengram.fr",
				"https://gp.staging.mythica.tengram.fr",
				"https://gp.mythica.tengram.fr",
				"https://staging.mythica.tengram.fr",
				"https://mythica.tengram.fr",
			],
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			exposeHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.all("/api/*", ({ request }) => proxy(request, env.API_URL, "/api"))
	.all("/gameplay/*", ({ request }) =>
		proxy(request, env.GAMEPLAY_URL, "/gameplay"),
	)
	.get("/", () => ({ status: "ok", gateway: "mythica-gateway" }))
	.listen(env.PORT);

logger.info(
	`Gateway running at http://${app.server?.hostname}:${app.server?.port}`,
);
