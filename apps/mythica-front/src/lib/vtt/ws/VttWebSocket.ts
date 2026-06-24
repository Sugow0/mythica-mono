import { campaignService } from "$lib/index.js";
import type { vttState as VttStateType } from "../vtt.svelte";
import type {
	CombatState,
	FogState,
	MapConfig,
	SessionTokenDto,
} from "../types";

type VttStateRef = typeof VttStateType;

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
			let msg: Record<string, unknown>;
			try {
				msg = JSON.parse(event.data) as Record<string, unknown>;
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

	private handleMessage(event: Record<string, unknown>) {
		const type = event.type as string;

		switch (type) {
			case "snapshot": {
				const snap = event as {
					type: string;
					tokens?: SessionTokenDto[];
					activeMap?: MapConfig;
					mapState?: { fog?: FogState };
					combatState?: CombatState;
					participants?: string[];
				};
				if (snap.tokens) this.state.setTokens(snap.tokens);
				if (snap.activeMap !== undefined)
					this.state.setActiveMap(snap.activeMap ?? null);
				if (snap.mapState?.fog) this.state.setFog(snap.mapState.fog);
				if (snap.combatState) this.state.setCombatState(snap.combatState);
				if (snap.participants) this.state.setParticipants(snap.participants);
				break;
			}
			case "TOKEN_MOVED":
				this.state.updateToken({
					id: event.tokenId as string,
					posX: String(event.x),
					posY: String(event.y),
				});
				break;
			case "TOKEN_REMOVED":
				this.state.removeToken(event.tokenId as string);
				break;
			case "TOKEN_UPDATED":
				this.state.updateToken(
					event as unknown as Partial<SessionTokenDto> & { id: string }
				);
				break;
			case "TOKEN_ADDED":
				this.state.addToken(event.token as SessionTokenDto);
				break;
			case "FOG_STATE":
				this.state.setFog(event.fog as FogState);
				break;
			case "MAP_CHANGE":
				this.state.setActiveMap((event.map as MapConfig) ?? null);
				break;
			case "COMBAT_STATE":
				this.state.setCombatState(event as unknown as CombatState);
				break;
			case "PRESENCE_JOIN":
			case "PRESENCE_LEAVE":
				this.state.setParticipants((event.participants as string[]) ?? []);
				break;
		}
	}

	send(event: Record<string, unknown>) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(event));
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
