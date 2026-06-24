// apps/mythica-front/src/lib/vtt/grid/FreeGrid.ts
import type { MapConfig } from "../types";

// Grille libre : pas de dessin, pas de snap.
export function drawFreeGrid() {
	/* no-op */
}

export function snapToFree(
	x: number,
	y: number,
	_config: MapConfig
): { x: number; y: number } {
	return { x, y };
}
