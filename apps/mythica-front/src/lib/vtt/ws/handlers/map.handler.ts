import type { vttState } from "../../vtt.svelte";
import type { MapConfig } from "../../types";

type VttState = typeof vttState;

export function handleMapEvent(
	state: VttState,
	event: Record<string, unknown>
) {
	if (event.type === "MAP_CHANGE") {
		state.setActiveMap((event.map as MapConfig) ?? null);
	}
}
