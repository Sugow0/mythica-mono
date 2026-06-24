import { Container, Graphics } from "pixi.js";
import type { FogState, MapConfig } from "../types";

export class FogLayer {
	private container: Container;
	private graphics: Graphics;

	constructor(stage: Container) {
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
		stage.addChild(this.container);
	}

	setFog(fog: FogState, config: MapConfig) {
		this.graphics.clear();

		// Draw full fog mask
		this.graphics
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0x000000, alpha: 0.6 });

		// Reveal areas
		if (fog.revealed.length > 0) {
			for (const polygon of fog.revealed) {
				if (polygon.length < 2) continue;
				this.graphics.moveTo(polygon[0].x, polygon[0].y);
				for (let i = 1; i < polygon.length; i++) {
					this.graphics.lineTo(polygon[i].x, polygon[i].y);
				}
				this.graphics.fill({ color: 0x000000, alpha: 0 }).closePath();
			}
		}
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
