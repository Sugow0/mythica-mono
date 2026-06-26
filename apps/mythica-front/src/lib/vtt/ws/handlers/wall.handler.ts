import type { vttState } from "../../vtt.svelte";
import type { SessionWallDto } from "../../types";

export function handleWallEvent(
	state: typeof vttState,
	event: Record<string, unknown>
) {
	switch (event.type) {
		case "WALL_ADDED": {
			const w = event.wall as SessionWallDto;
			state.addWall(w);
			break;
		}
		case "WALL_REMOVED": {
			const wallId = event.wallId as string;
			state.removeWall(wallId);
			break;
		}
		case "WALL_CLEARED": {
			state.clearWalls();
			break;
		}
	}
}
