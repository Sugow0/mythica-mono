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

		// Draw solid fog overlay
		this.fogGraphics.clear();
		this.fogGraphics
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0x0a0a14 });

		// Draw revealed areas as white polygons for the mask
		this.maskGraphics.clear();
		for (const polygon of fog.revealed) {
			if (polygon.length < 3) continue;
			const points = polygon.flatMap((p) => [p.x, p.y]);
			this.maskGraphics.poly(points).fill({ color: 0xffffff });
		}

		// Apply mask: fogGraphics is masked by maskGraphics (white = visible through)
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
