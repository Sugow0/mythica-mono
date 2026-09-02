import type { vttState } from "../../vtt.svelte";
import type { FogState } from "../../types";

type VttState = typeof vttState;

export function handleFogEvent(
	state: VttState,
	event: Record<string, unknown>
) {
	if (event.type === "FOG_STATE") {
		state.setFog(event.fog as FogState);
	}
}
