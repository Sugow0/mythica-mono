import { sessionRooms } from "./session-rooms";

/**
 * Présence des utilisateurs dans une session WebSocket.
 *
 * Émet `PRESENCE_JOIN` quand un utilisateur arrive dans la room et
 * `PRESENCE_LEAVE` quand il la quitte. Plusieurs connexions d'un même
 * utilisateur (onglets) ne comptent que pour une présence. À la fermeture de la
 * dernière connexion, un délai de grâce (30 s) laisse le temps de se reconnecter
 * sans clignotement : si l'utilisateur revient avant l'échéance, aucun
 * `PRESENCE_LEAVE` n'est émis.
 */

export const PRESENCE_JOIN = "PRESENCE_JOIN";
export const PRESENCE_LEAVE = "PRESENCE_LEAVE";
export const RECONNECT_GRACE_MS = 30_000;

type Broadcast = (sessionId: string, message: unknown) => unknown;
type TimerHandle = ReturnType<typeof setTimeout>;

type PresenceTrackerOptions = {
	broadcast: Broadcast;
	graceMs?: number;
	setTimer?: (cb: () => void, ms: number) => TimerHandle;
	clearTimer?: (handle: TimerHandle) => void;
};

type UserPresence = { count: number; leaveTimer?: TimerHandle };

export function createPresenceTracker(opts: PresenceTrackerOptions) {
	const graceMs = opts.graceMs ?? RECONNECT_GRACE_MS;
	const setTimer = opts.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
	const clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h));

	const sessions = new Map<string, Map<string, UserPresence>>();

	function usersOf(sessionId: string): Map<string, UserPresence> {
		let users = sessions.get(sessionId);
		if (!users) {
			users = new Map();
			sessions.set(sessionId, users);
		}
		return users;
	}

	/**
	 * Enregistre une connexion. Émet `PRESENCE_JOIN` uniquement quand
	 * l'utilisateur devient présent (1re connexion, hors reconnexion en grâce).
	 */
	function connect(sessionId: string, userId: string): void {
		const users = usersOf(sessionId);
		const entry = users.get(userId);

		// Reconnexion pendant le délai de grâce : on annule le départ, pas de JOIN.
		if (entry?.leaveTimer !== undefined) {
			clearTimer(entry.leaveTimer);
			entry.leaveTimer = undefined;
			entry.count += 1;
			return;
		}

		if (!entry) {
			users.set(userId, { count: 1 });
			opts.broadcast(sessionId, { type: PRESENCE_JOIN, userId });
			return;
		}

		// Onglet supplémentaire d'un utilisateur déjà présent : pas de JOIN.
		entry.count += 1;
	}

	/**
	 * Enregistre une déconnexion. À la dernière connexion fermée, démarre le délai
	 * de grâce avant d'émettre `PRESENCE_LEAVE`.
	 */
	function disconnect(sessionId: string, userId: string): void {
		const users = sessions.get(sessionId);
		const entry = users?.get(userId);
		if (!users || !entry || entry.count === 0) return;

		entry.count -= 1;
		if (entry.count > 0) return;

		entry.leaveTimer = setTimer(() => {
			users.delete(userId);
			if (users.size === 0) sessions.delete(sessionId);
			opts.broadcast(sessionId, { type: PRESENCE_LEAVE, userId });
		}, graceMs);
	}

	/** Vrai si l'utilisateur est présent (connecté ou en délai de grâce). */
	function isPresent(sessionId: string, userId: string): boolean {
		return sessions.get(sessionId)?.has(userId) ?? false;
	}

	/** Identifiants des utilisateurs présents dans la session. */
	function participants(sessionId: string): string[] {
		const users = sessions.get(sessionId);
		return users ? [...users.keys()] : [];
	}

	return { connect, disconnect, isPresent, participants };
}

/** Tracker de présence partagé, diffusant via les rooms WebSocket. */
export const sessionPresence = createPresenceTracker({
	broadcast: (sessionId, message) => sessionRooms.broadcast(sessionId, message),
});
