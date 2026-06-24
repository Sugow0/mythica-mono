import type { vttState } from "../../vtt.svelte";

type VttState = typeof vttState;

export function handlePresenceEvent(
	state: VttState,
	event: Record<string, unknown>
) {
	if (event.type === "PRESENCE_JOIN" || event.type === "PRESENCE_LEAVE") {
		const participants = event.participants as string[];
		state.setParticipants(participants ?? []);
	}
}
