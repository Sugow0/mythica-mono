// apps/mythica-front/src/lib/vtt/layers/GridLayer.ts
import { Container, Graphics } from "pixi.js";
import type { MapConfig } from "../types";
import { drawSquareGrid, snapToSquare } from "../grid/SquareGrid";
import { drawHexGrid, snapToHex } from "../grid/HexGrid";
import { drawFreeGrid, snapToFree } from "../grid/FreeGrid";

export class GridLayer {
	private container: Container;
	private graphics: Graphics;
	private config: MapConfig | null = null;

	constructor(stage: Container) {
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
		stage.addChildAt(this.container, 1);
	}

	setGrid(config: MapConfig) {
		this.config = config;
		this.graphics.clear();
		switch (config.gridType) {
			case "square":
				drawSquareGrid(this.graphics, config);
				break;
			case "hex":
				drawHexGrid(this.graphics, config);
				break;
			case "free":
				drawFreeGrid();
				break;
		}
	}

	snap(x: number, y: number): { x: number; y: number } {
		if (!this.config) return { x, y };
		switch (this.config.gridType) {
			case "square":
				return snapToSquare(x, y, this.config);
			case "hex":
				return snapToHex(x, y, this.config);
			case "free":
				return snapToFree(x, y, this.config);
		}
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
