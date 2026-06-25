import type { vttState } from "../../vtt.svelte";

type VttState = typeof vttState;

export function handleTokenEvent(
	state: VttState,
	event: Record<string, unknown>
) {
	switch (event.type) {
		case "TOKEN_MOVED":
			state.updateToken({
				id: event.tokenId as string,
				posX: String(event.x),
				posY: String(event.y),
			});
			break;
		case "TOKEN_REMOVED":
			state.removeToken(event.tokenId as string);
			break;
		case "TOKEN_UPDATED":
			state.updateToken({
				...(event as object),
				id: event.tokenId as string,
			} as Parameters<typeof state.updateToken>[0]);
			break;
		case "TOKEN_ADDED":
			state.addToken(event.token as Parameters<typeof state.addToken>[0]);
			break;
	}
}
