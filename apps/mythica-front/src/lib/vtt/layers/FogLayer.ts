import { Container, Graphics } from "pixi.js";
import type { FogState, MapConfig } from "../types";

/**
 * Fog of War via PixiJS v8 `.cut()` — la méthode native pour creuser des
 * trous dans une forme Graphics. On dessine un rectangle de brouillard, puis
 * chaque zone révélée est soustraite avec `.cut()`. Pas de mask, pas de
 * blendMode erase, pas de render group : simple et fiable.
 */
export class FogLayer {
	private container: Container;
	private graphics: Graphics;
	private isActive = true;

	constructor(stage: Container) {
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
		this.container.alpha = 0.85;
		stage.addChild(this.container);
	}

	setFog(fog: FogState, config: MapConfig) {
		if (!this.isActive) return;

		this.graphics.clear();

		// Dessin du rectangle de brouillard couvrant toute la map
		this.graphics.rect(0, 0, config.widthPx, config.heightPx).fill({
			color: 0x0a0a14,
		});

		// Zones révélées : on trace le polygone PUIS on appelle .cut()
		// pour percer un trou dans le rectangle précédent.
		for (const polygon of fog.revealed) {
			if (polygon.length < 3) continue;
			const [first, ...rest] = polygon;
			this.graphics.moveTo(first.x, first.y);
			for (const p of rest) {
				this.graphics.lineTo(p.x, p.y);
			}
			this.graphics.closePath().cut();
		}
	}

	toggle(active: boolean) {
		this.isActive = active;
		this.container.visible = active;
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
