import { Container, Graphics } from "pixi.js";
import type { MapConfig } from "../types";

export class GridLayer {
	private container: Container;
	private graphics: Graphics;

	constructor(stage: Container) {
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
		stage.addChild(this.container);
	}

	setGrid(config: MapConfig) {
		this.graphics.clear();

		if (config.gridType === "free") return;

		const color = parseInt(config.gridColor.replace("#", ""), 16);
		const alpha = config.gridOpacity;
		const size = config.gridSize;

		this.graphics.setStrokeStyle({ width: 1, color, alpha }).moveTo(0, 0);

		if (config.gridType === "square") {
			for (let x = config.gridOffsetX; x <= config.widthPx; x += size) {
				this.graphics.moveTo(x, 0).lineTo(x, config.heightPx);
			}
			for (let y = config.gridOffsetY; y <= config.heightPx; y += size) {
				this.graphics.moveTo(0, y).lineTo(config.widthPx, y);
			}
		}

		this.graphics.stroke();
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
