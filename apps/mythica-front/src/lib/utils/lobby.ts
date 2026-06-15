/** Helpers purs de la salle d'attente (lobby) — testables hors composant. */

export type SessionStatus = "scheduled" | "active" | "paused" | "ended";

/** Données diffusées sur le flux SSE de présence d'une session. */
export type PresenceEvent = {
	users: string[];
	status?: string;
};

/** Libellé français du statut d'une session. */
export function sessionStatusLabel(status: string): string {
	switch (status) {
		case "scheduled":
			return "En attente";
		case "active":
			return "En cours";
		case "paused":
			return "En pause";
		case "ended":
			return "Terminée";
		default:
			return status;
	}
}

/** Libellé français du rôle d'un membre. */
export function roleLabel(role: string): string {
	switch (role) {
		case "gm":
			return "MJ";
		case "player":
			return "Joueur";
		case "spectator":
			return "Spectateur";
		default:
			return role;
	}
}

/**
 * Analyse une trame du flux de présence. Retourne null pour les heartbeats
 * (« : ping ») et toute trame non-JSON ou sans liste d'utilisateurs valide.
 */
export function parsePresenceEvent(data: string): PresenceEvent | null {
	try {
		const parsed = JSON.parse(data) as Partial<PresenceEvent>;
		if (!Array.isArray(parsed.users)) return null;
		return {
			users: parsed.users,
			...(typeof parsed.status === "string" ? { status: parsed.status } : {}),
		};
	} catch {
		return null;
	}
}

/** Nombre de membres actuellement connectés (intersection présence ∩ membres). */
export function countOnline(
	memberIds: string[],
	connected: ReadonlySet<string>
): number {
	return memberIds.filter((id) => connected.has(id)).length;
}
