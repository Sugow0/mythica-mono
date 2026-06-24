import { campaignService } from "$lib/index.js";
import type { vttState as VttStateType } from "../vtt.svelte";
import type {
	CombatState,
	FogState,
	MapConfig,
	SessionTokenDto,
} from "../types";

type VttStateRef = typeof VttStateType;

type WsMessage =
	| { type: "tokens"; payload: SessionTokenDto[] }
	| { type: "token_update"; payload: Partial<SessionTokenDto> & { id: string } }
	| { type: "token_add"; payload: SessionTokenDto }
	| { type: "token_remove"; payload: { id: string } }
	| { type: "fog"; payload: FogState }
	| { type: "map"; payload: MapConfig }
	| { type: "combat"; payload: CombatState }
	| { type: "presence"; payload: string[] };

export class VttWebSocket {
	private sessionId: string;
	private state: VttStateRef;
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = 2000;
	private destroyed = false;

	constructor(sessionId: string, state: VttStateRef) {
		this.sessionId = sessionId;
		this.state = state;
	}

	connect() {
		if (this.destroyed) return;

		const url = campaignService.sessionSocketUrl(this.sessionId);
		this.ws = new WebSocket(url);

		this.ws.onopen = () => {
			this.reconnectDelay = 2000;
		};

		this.ws.onmessage = (event: MessageEvent<string>) => {
			let msg: WsMessage;
			try {
				msg = JSON.parse(event.data) as WsMessage;
			} catch {
				return;
			}
			this.handleMessage(msg);
		};

		this.ws.onclose = () => {
			if (!this.destroyed) {
				this.scheduleReconnect();
			}
		};

		this.ws.onerror = () => {
			this.ws?.close();
		};
	}

	private handleMessage(msg: WsMessage) {
		switch (msg.type) {
			case "tokens":
				this.state.setTokens(msg.payload);
				break;
			case "token_update":
				this.state.updateToken(msg.payload);
				break;
			case "token_add":
				this.state.addToken(msg.payload);
				break;
			case "token_remove":
				this.state.removeToken(msg.payload.id);
				break;
			case "fog":
				this.state.setFog(msg.payload);
				break;
			case "map":
				this.state.setActiveMap(msg.payload);
				break;
			case "combat":
				this.state.setCombatState(msg.payload);
				break;
			case "presence":
				this.state.setParticipants(msg.payload);
				break;
		}
	}

	send(type: string, payload: unknown) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type, payload }));
		}
	}

	private scheduleReconnect() {
		this.reconnectTimer = setTimeout(() => {
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
			this.connect();
		}, this.reconnectDelay);
	}

	disconnect() {
		this.destroyed = true;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.ws?.close();
		this.ws = null;
	}
}
