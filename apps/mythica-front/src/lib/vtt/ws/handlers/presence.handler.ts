import type { vttState } from "../../vtt.svelte";

type VttState = typeof vttState;

export function handlePresenceEvent(
	state: VttState,
	event: Record<string, unknown>
) {
	const userId = event.userId as string | undefined;
	if (!userId) return;
	if (event.type === "PRESENCE_JOIN") {
		if (!state.participants.includes(userId)) {
			state.setParticipants([...state.participants, userId]);
		}
	} else if (event.type === "PRESENCE_LEAVE") {
		state.setParticipants(state.participants.filter((p) => p !== userId));
	}
}
