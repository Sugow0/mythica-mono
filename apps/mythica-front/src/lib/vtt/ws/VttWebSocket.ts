import { campaignService } from "$lib/index.js";
import type { vttState as VttStateType } from "../vtt.svelte";
import type {
	CombatState,
	FogState,
	MapConfig,
	SessionTokenDto,
} from "../types";
import { handleTokenEvent } from "./handlers/token.handler";
import { handleFogEvent } from "./handlers/fog.handler";
import { handleMapEvent } from "./handlers/map.handler";
import { handleCombatEvent } from "./handlers/combat.handler";
import { handlePresenceEvent } from "./handlers/presence.handler";

type VttStateRef = typeof VttStateType;

export type WsStatus = "connecting" | "open" | "closed" | "error";

export class VttWebSocket {
	private sessionId: string;
	private state: VttStateRef;
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = 2000;
	private destroyed = false;
	public status: WsStatus = "connecting";
	public onStatusChange: ((s: WsStatus) => void) | null = null;

	constructor(sessionId: string, state: VttStateRef) {
		this.sessionId = sessionId;
		this.state = state;
	}

	private setStatus(s: WsStatus) {
		this.status = s;
		this.onStatusChange?.(s);
	}

	connect() {
		if (this.destroyed) return;

		const url = campaignService.sessionSocketUrl(this.sessionId);
		console.log("[VTT WS] connexion vers", url);
		this.ws = new WebSocket(url);
		this.setStatus("connecting");

		this.ws.onopen = () => {
			this.reconnectDelay = 2000;
			this.setStatus("open");
			console.log("[VTT WS] connecté");
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

		this.ws.onclose = (e) => {
			console.log("[VTT WS] fermé", e.code, e.reason);
			this.setStatus("closed");
			if (!this.destroyed) {
				this.scheduleReconnect();
			}
		};

		this.ws.onerror = (e) => {
			console.error("[VTT WS] erreur", e);
			this.setStatus("error");
			this.ws?.close();
		};
	}

	private handleMessage(event: Record<string, unknown>) {
		const type = event.type as string;

		if (type === "snapshot") {
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
			return;
		}

		if (type.startsWith("TOKEN_")) {
			handleTokenEvent(this.state, event);
			return;
		}
		if (type.startsWith("FOG_")) {
			handleFogEvent(this.state, event);
			return;
		}
		if (type === "MAP_CHANGE") {
			handleMapEvent(this.state, event);
			return;
		}
		if (type === "COMBAT_STATE") {
			handleCombatEvent(this.state, event);
			return;
		}
		if (type.startsWith("PRESENCE_")) {
			handlePresenceEvent(this.state, event);
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
