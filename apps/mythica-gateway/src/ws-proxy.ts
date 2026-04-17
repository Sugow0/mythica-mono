import type { ServerWebSocket } from "bun";
import { env } from "./env";
import { logger } from "./logger";

type WsData = { targetUrl: string };

const upstreamSockets = new Map<ServerWebSocket<WsData>, WebSocket>();

export const wsProxy = Bun.serve<WsData>({
	port: env.WS_PORT,

	fetch(req, server) {
		const url = new URL(req.url);
		let targetBase: string;
		let prefix: string;

		if (url.pathname.startsWith("/gameplay")) {
			targetBase = env.GAMEPLAY_SOCKET_URL.replace(/^http/, "ws");
			prefix = "/gameplay";
		} else {
			targetBase = env.API_SOCKET_URL.replace(/^http/, "ws");
			prefix = "/api";
		}

		const targetPath = url.pathname.slice(prefix.length) || "/";
		const targetUrl = `${targetBase}${targetPath}${url.search}`;

		const upgraded = server.upgrade(req, { data: { targetUrl } });
		if (!upgraded)
			return new Response("WebSocket upgrade failed", { status: 400 });
	},

	websocket: {
		open(ws) {
			const upstream = new WebSocket(ws.data.targetUrl);
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
