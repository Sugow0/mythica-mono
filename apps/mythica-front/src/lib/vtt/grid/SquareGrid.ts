// apps/mythica-front/src/lib/vtt/grid/SquareGrid.ts
import { Graphics } from "pixi.js";
import type { MapConfig } from "../types";

export function drawSquareGrid(graphics: Graphics, config: MapConfig) {
	const {
		gridSize,
		gridOffsetX,
		gridOffsetY,
		gridColor,
		gridOpacity,
		widthPx,
		heightPx,
	} = config;
	const color = parseInt(gridColor.replace("#", "").slice(0, 6), 16);
	const alpha = gridOpacity;

	graphics.clear();

	// Lignes verticales
	for (let x = gridOffsetX % gridSize; x <= widthPx; x += gridSize) {
		graphics
			.moveTo(x, 0)
			.lineTo(x, heightPx)
			.stroke({ color, alpha, width: 1 });
	}
	// Lignes horizontales
	for (let y = gridOffsetY % gridSize; y <= heightPx; y += gridSize) {
		graphics.moveTo(0, y).lineTo(widthPx, y).stroke({ color, alpha, width: 1 });
	}
}

/** Snap une coordonnée pixel à la grille carrée la plus proche. */
export function snapToSquare(
	x: number,
	y: number,
	config: MapConfig
): { x: number; y: number } {
	const s = config.gridSize;
	return {
		x: Math.round(x / s) * s,
		y: Math.round(y / s) * s,
	};
}
