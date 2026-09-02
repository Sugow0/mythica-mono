/** Logique pure de l'état de session temps réel — testable hors composant. */

export type SessionState = {
	participants: string[];
	mapState: unknown;
	activeTurn: string | null;
};

export const initialSessionState: SessionState = {
	participants: [],
	mapState: null,
	activeTurn: null,
};

/** Trames applicables reçues sur le WebSocket de session. */
export type SessionEvent =
	| {
			type: "snapshot";
			participants?: string[];
			mapState?: unknown;
			activeTurn?: string | null;
	  }
	| { type: "PRESENCE_JOIN"; userId: string }
	| { type: "PRESENCE_LEAVE"; userId: string }
	| { type: "map-state"; mapState: unknown }
	| { type: "turn"; activeTurn: string | null }
	| { type: string; [key: string]: unknown };

/**
 * Analyse une trame WebSocket. Retourne null pour toute trame non-JSON ou sans
 * `type` exploitable (heartbeats, bruit).
 */
export function parseSessionEvent(data: string): SessionEvent | null {
	try {
		const parsed = JSON.parse(data) as Partial<SessionEvent>;
		if (typeof parsed?.type !== "string") return null;
		return parsed as SessionEvent;
	} catch {
		return null;
	}
}

/** Réduit l'état de session en appliquant une trame. Immuable (nouvel objet). */
export function reduceSessionState(
	state: SessionState,
	event: SessionEvent
): SessionState {
	switch (event.type) {
		case "snapshot": {
			const e = event as {
				participants?: string[];
				mapState?: unknown;
				activeTurn?: string | null;
			};
			return {
				participants: e.participants ?? state.participants,
				mapState: e.mapState ?? state.mapState,
				activeTurn: e.activeTurn ?? state.activeTurn,
			};
		}
		case "PRESENCE_JOIN": {
			const { userId } = event as { userId: string };
			if (state.participants.includes(userId)) return state;
			return { ...state, participants: [...state.participants, userId] };
		}
		case "PRESENCE_LEAVE": {
			const { userId } = event as { userId: string };
			return {
				...state,
				participants: state.participants.filter((id) => id !== userId),
			};
		}
		case "map-state":
			return { ...state, mapState: (event as { mapState: unknown }).mapState };
		case "turn":
			return {
				...state,
				activeTurn: (event as { activeTurn: string | null }).activeTurn,
			};
		default:
			return state;
	}
}

export const RECONNECT_BASE_MS = 500;
export const RECONNECT_MAX_MS = 30_000;

/**
 * Délai avant la n-ième tentative de reconnexion (backoff exponentiel borné).
 * attempt = 0 pour la première reconnexion.
 */
export function nextReconnectDelay(
	attempt: number,
	base = RECONNECT_BASE_MS,
	max = RECONNECT_MAX_MS
): number {
	return Math.min(max, base * 2 ** attempt);
}
