import type { vttState } from "../../vtt.svelte";
import type { CombatState } from "../../types";

type VttState = typeof vttState;

export function handleCombatEvent(
	state: VttState,
	event: Record<string, unknown>
) {
	if (event.type === "COMBAT_STATE") {
		state.setCombatState(event as unknown as CombatState);
	}
}
