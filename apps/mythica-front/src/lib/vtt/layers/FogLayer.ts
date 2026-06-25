import { Container, Graphics } from "pixi.js";
import type { FogState, MapConfig } from "../types";

/**
 * Fog of War via PixiJS v8 blend mode "erase".
 *
 * Le fogContainer est un renderGroup isolé : toute la couche fog est rendue
 * dans une texture propre. Les zones révélées sont dessinées avec blendMode
 * "erase" qui perce des trous dans cette texture, laissant voir la carte
 * en dessous sans renderer de masque séparé.
 */
export class FogLayer {
	private fogContainer: Container;
	private fogBase: Graphics;
	private revealGraphics: Graphics;
	private isActive = true;

	constructor(stage: Container) {
		this.fogContainer = new Container();
		// renderGroup isole la couche dans sa propre texture — requis pour "erase"
		this.fogContainer.isRenderGroup = true;
		this.fogContainer.alpha = 0.85;

		this.fogBase = new Graphics();
		this.revealGraphics = new Graphics();

		this.fogContainer.addChild(this.fogBase);
		this.fogContainer.addChild(this.revealGraphics);

		stage.addChild(this.fogContainer);
	}

	setFog(fog: FogState, config: MapConfig) {
		if (!this.isActive) return;

		// Couverture totale en brouillard sombre
		this.fogBase.clear();
		this.fogBase
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0x0a0a14 });

		// Zones révélées : mode "erase" perce des trous dans la texture du container
		this.revealGraphics.clear();
		this.revealGraphics.blendMode = "erase";

		for (const polygon of fog.revealed) {
			if (polygon.length < 3) continue;
			const points = polygon.flatMap((p) => [p.x, p.y]);
			this.revealGraphics.poly(points).fill({ color: 0xffffff, alpha: 1 });
		}
	}

	toggle(active: boolean) {
		this.isActive = active;
		this.fogContainer.visible = active;
	}

	destroy() {
		this.fogContainer.destroy({ children: true });
	}
}
