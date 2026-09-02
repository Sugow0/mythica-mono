import { prisma } from "../lib/prisma";
import { isGameMaster, resolveSessionAccess } from "./session-access";

/**
 * Suivi du tour de combat (initiative tracker) d'une session.
 *
 * L'état est persisté dans `Session.combatState`. Les réducteurs ci-dessous sont
 * purs (testables sans DB) ; `handleCombatCommand` applique une commande reçue
 * par WebSocket après contrôle du rôle MJ, persiste et retourne l'événement à
 * diffuser à la room.
 */

export type CombatState = {
	started: boolean;
	order: string[];
	activeIndex: number;
	round: number;
	activeTurn: string | null;
};

export const emptyCombat = (): CombatState => ({
	started: false,
	order: [],
	activeIndex: 0,
	round: 0,
	activeTurn: null,
});

/** Démarre le combat avec un ordre d'initiative ; le 1er entre en jeu. */
export function startCombat(order: string[]): CombatState {
	return {
		started: true,
		order: [...order],
		activeIndex: 0,
		round: 1,
		activeTurn: order[0] ?? null,
	};
}

/** Passe au tour suivant (boucle en fin d'ordre, incrémente la manche). */
export function advanceTurn(state: CombatState): CombatState {
	if (!state.started || state.order.length === 0) return state;
	const nextIndex = (state.activeIndex + 1) % state.order.length;
	const round = nextIndex === 0 ? state.round + 1 : state.round;
	return {
		...state,
		activeIndex: nextIndex,
		round,
		activeTurn: state.order[nextIndex] ?? null,
	};
}

/** Force le tour actif sur une entrée donnée (sans effet si absente). */
export function setTurn(state: CombatState, entryId: string): CombatState {
	const index = state.order.indexOf(entryId);
	if (index < 0) return state;
	return { ...state, activeIndex: index, activeTurn: entryId };
}

export type CombatCommand =
	| { type: "COMBAT_START"; order: string[] }
	| { type: "TURN_NEXT" }
	| { type: "TURN_SET"; entryId: string };

export type CombatStateEvent = { type: "COMBAT_STATE" } & CombatState;

/** Analyse une trame WebSocket en commande de combat connue, sinon null. */
export function parseCombatCommand(raw: unknown): CombatCommand | null {
	let data: unknown = raw;
	if (typeof raw === "string") {
		try {
			data = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!data || typeof data !== "object") return null;
	const cmd = data as Record<string, unknown>;
	switch (cmd.type) {
		case "COMBAT_START":
			if (
				Array.isArray(cmd.order) &&
				cmd.order.every((id) => typeof id === "string")
			) {
				return { type: "COMBAT_START", order: cmd.order as string[] };
			}
			return null;
		case "TURN_NEXT":
			return { type: "TURN_NEXT" };
		case "TURN_SET":
			return typeof cmd.entryId === "string"
				? { type: "TURN_SET", entryId: cmd.entryId }
				: null;
		default:
			return null;
	}
}

/** Applique une commande de combat (réservée au MJ) puis persiste l'état. */
export async function handleCombatCommand(
	sessionId: string,
	userId: string,
	command: CombatCommand,
): Promise<CombatStateEvent | null> {
	const access = await resolveSessionAccess(sessionId, {
		id: userId,
		role: null,
	});
	if (!access.ok) return null;
	if (!isGameMaster(access)({ id: userId, role: null })) return null;

	const current =
		command.type === "COMBAT_START"
			? emptyCombat()
			: (((await prisma.session.findUnique({ where: { id: sessionId } }))
					?.combatState ?? emptyCombat()) as CombatState);

	let next: CombatState;
	switch (command.type) {
		case "COMBAT_START":
			next = startCombat(command.order);
			break;
		case "TURN_NEXT":
			next = advanceTurn(current);
			break;
		case "TURN_SET":
			next = setTurn(current, command.entryId);
			break;
	}

	await prisma.session.update({
		where: { id: sessionId },
		data: { combatState: next },
	});
	return { type: "COMBAT_STATE", ...next };
}
