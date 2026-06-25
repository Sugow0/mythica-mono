// apps/mythica-front/src/lib/vtt/grid/HexGrid.ts
import { Graphics } from "pixi.js";
import type { MapConfig } from "../types";

/** Grille hexagonale pointy-top (angle plat en haut et bas). */
export function drawHexGrid(graphics: Graphics, config: MapConfig) {
	const { gridSize, gridColor, gridOpacity, widthPx, heightPx } = config;
	const color = parseInt(gridColor.replace("#", "").slice(0, 6), 16);
	const alpha = gridOpacity;
	const r = gridSize / 2;
	const h = r * Math.sqrt(3);
	const w = r * 2;

	graphics.clear();

	let row = 0;
	for (let y = 0; y < heightPx + h; y += h) {
		const xOffset = (row % 2) * (w * 0.75);
		for (let x = -w; x < widthPx + w; x += w * 1.5) {
			drawHex(graphics, x + xOffset, y, r, color, alpha);
		}
		row++;
	}
}

function drawHex(
	g: Graphics,
	cx: number,
	cy: number,
	r: number,
	color: number,
	alpha: number
) {
	const points: number[] = [];
	for (let i = 0; i < 6; i++) {
		const angle = (Math.PI / 180) * (60 * i - 30);
		points.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
	}
	g.poly(points).stroke({ color, alpha, width: 1 });
}

export function snapToHex(
	x: number,
	y: number,
	config: MapConfig
): { x: number; y: number } {
	// Snap simple au centre de l'hexagone le plus proche (approximation)
	const r = config.gridSize / 2;
	const h = r * Math.sqrt(3);
	const row = Math.round(y / h);
	const xOffset = (row % 2) * r * 0.75;
	const col = Math.round((x - xOffset) / (r * 1.5));
	return { x: col * r * 1.5 + xOffset, y: row * h };
}
