import {
	initialSessionState,
	nextReconnectDelay,
	parseSessionEvent,
	reduceSessionState,
	type SessionState,
} from "$lib/utils/session-events";

export type ConnectionStatus = "connecting" | "open" | "closed";

/**
 * Store réactif de l'état temps réel d'une session de jeu (runes Svelte 5).
 *
 * Gère la connexion WebSocket, l'application des trames (présence, état carte,
 * tour actif) via le réducteur pur `reduceSessionState`, et la reconnexion
 * automatique avec backoff exponentiel. La logique métier est déléguée à
 * `session-events` (testée unitairement) ; cette classe n'est qu'un câblage.
 */
export class SessionStore {
	status = $state<ConnectionStatus>("closed");
	#data = $state<SessionState>(initialSessionState);

	readonly #url: string;
	#ws: WebSocket | null = null;
	#attempt = 0;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#closedByUser = false;

	constructor(url: string) {
		this.#url = url;
	}

	get participants(): string[] {
		return this.#data.participants;
	}
	get mapState(): unknown {
		return this.#data.mapState;
	}
	get activeTurn(): string | null {
		return this.#data.activeTurn;
	}

	/** Ouvre (ou ré-ouvre) la connexion WebSocket. */
	connect(): void {
		this.#closedByUser = false;
		this.#open();
	}

	#open(): void {
		this.status = "connecting";
		const ws = new WebSocket(this.#url);
		this.#ws = ws;

		ws.onopen = () => {
			this.status = "open";
			this.#attempt = 0;
		};
		ws.onmessage = (event: MessageEvent) => {
			const parsed = parseSessionEvent(String(event.data));
			if (parsed) this.#data = reduceSessionState(this.#data, parsed);
		};
		ws.onerror = () => ws.close();
		ws.onclose = () => {
			this.status = "closed";
			if (!this.#closedByUser) this.#scheduleReconnect();
		};
	}

	#scheduleReconnect(): void {
		const delay = nextReconnectDelay(this.#attempt);
		this.#attempt += 1;
		this.#reconnectTimer = setTimeout(() => this.#open(), delay);
	}

	/** Ferme la connexion et stoppe toute tentative de reconnexion. */
	disconnect(): void {
		this.#closedByUser = true;
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}
		this.#ws?.close();
		this.#ws = null;
		this.status = "closed";
	}
}
