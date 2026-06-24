import { Container, Graphics } from "pixi.js";
import type { FogState, MapConfig } from "../types";

export class FogLayer {
	private fogContainer: Container;
	private fogGraphics: Graphics;
	private maskGraphics: Graphics;
	private isActive = true;

	constructor(stage: Container) {
		this.fogContainer = new Container();
		this.fogGraphics = new Graphics();
		this.maskGraphics = new Graphics();
		this.fogContainer.addChild(this.fogGraphics);
		this.fogContainer.addChild(this.maskGraphics);
		stage.addChild(this.fogContainer);
		this.fogContainer.alpha = 0.9;
	}

	setFog(fog: FogState, config: MapConfig) {
		if (!this.isActive) return;

		this.fogGraphics.clear();
		this.maskGraphics.clear();

		// Dark fog covers the whole map
		this.fogGraphics
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0x0a0a14 });

		// Mask: fill whole map white (fog visible), then fill revealed areas black
		// (fog hidden in revealed areas). White = fog shown, black = fog hidden.
		this.maskGraphics
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0xffffff });

		for (const polygon of fog.revealed) {
			if (polygon.length < 3) continue;
			const points = polygon.flatMap((p) => [p.x, p.y]);
			this.maskGraphics.poly(points).fill({ color: 0x000000 });
		}

		this.fogGraphics.mask = this.maskGraphics;
	}

	toggle(active: boolean) {
		this.isActive = active;
		this.fogContainer.visible = active;
	}

	destroy() {
		this.fogContainer.destroy({ children: true });
	}
}
