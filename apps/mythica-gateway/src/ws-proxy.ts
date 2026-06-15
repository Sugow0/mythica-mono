import type { ServerWebSocket } from "bun";
import { resolveUser } from "./auth/session";
import { env } from "./env";
import { logger } from "./logger";
import { buildTargetUrl, buildUpstreamHeaders } from "./ws-routing";

type WsData = { targetUrl: string; headers: Record<string, string> };

const upstreamSockets = new Map<ServerWebSocket<WsData>, WebSocket>();

export const wsProxy = Bun.serve<WsData>({
	port: env.WS_PORT,

	async fetch(req, server) {
		const url = new URL(req.url);
		const targetUrl = buildTargetUrl(
			url,
			env.GAMEPLAY_SOCKET_URL,
			env.API_SOCKET_URL,
		);

		// Identité résolue depuis le cookie de session (validé contre Redis) et
		// propagée au service upstream — même principe anti-spoof que le proxy HTTP.
		const user = await resolveUser(req);
		const headers = buildUpstreamHeaders(user);

		const upgraded = server.upgrade(req, { data: { targetUrl, headers } });
		if (!upgraded)
			return new Response("WebSocket upgrade failed", { status: 400 });
	},

	websocket: {
		open(ws) {
			const { targetUrl, headers } = ws.data;
			const upstream = new WebSocket(targetUrl, { headers });
			upstreamSockets.set(ws, upstream);

			upstream.onmessage = (event) => {
				ws.send(event.data as string | Buffer);
			};

			upstream.onclose = (event) => {
				ws.close(event.code, event.reason);
				upstreamSockets.delete(ws);
			};

			upstream.onerror = (err) => {
				logger.error({ err }, "Upstream WebSocket connection error");
				ws.close(1011, "Upstream connection error");
				upstreamSockets.delete(ws);
			};
		},

		message(ws, message) {
			const upstream = upstreamSockets.get(ws);
			if (upstream?.readyState === WebSocket.OPEN) {
				upstream.send(message as string | ArrayBuffer);
			}
		},

		close(ws, code, reason) {
			const upstream = upstreamSockets.get(ws);
			upstream?.close(code, reason);
			upstreamSockets.delete(ws);
		},
	},
});

logger.info(`WS Proxy running at ws://${wsProxy.hostname}:${wsProxy.port}`);
