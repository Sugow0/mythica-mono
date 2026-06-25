import { Container, Graphics } from "pixi.js";
import type { FogState, MapConfig } from "../types";

/**
 * Fog of War via masque alpha PixiJS v8.
 *
 * fogGraphics : rectangle sombre couvrant toute la map.
 * fogMask     : formes blanches = zones où le fog est visible,
 *               formes noires  = zones révélées (fog transparent).
 *
 * fogMask n'est PAS dans le display tree → PixiJS v8 l'utilise
 * uniquement pour le stencil, il n'apparaît pas à l'écran.
 * Les chevauchements de zones révélées sont gérés correctement
 * car des formes noires superposées restent noires (pas d'artefact).
 */
export class FogLayer {
	private container: Container;
	private fogGraphics: Graphics;
	private fogMask: Graphics;
	private isActive = true;

	constructor(stage: Container) {
		this.container = new Container();
		this.container.alpha = 0.85;

		this.fogGraphics = new Graphics();
		this.fogMask = new Graphics();

		// fogGraphics est dans le display tree, fogMask sert uniquement de masque
		this.container.addChild(this.fogGraphics);
		this.fogGraphics.mask = this.fogMask;

		stage.addChild(this.container);
	}

	setFog(fog: FogState, config: MapConfig) {
		if (!this.isActive) return;

		this.fogGraphics.clear();
		this.fogMask.clear();

		// Brouillard sombre sur toute la map
		this.fogGraphics
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0x0a0a14 });

		// Masque : blanc = fog visible, noir = fog caché (zone révélée)
		// On remplit d'abord tout en blanc (fog partout)
		this.fogMask
			.rect(0, 0, config.widthPx, config.heightPx)
			.fill({ color: 0xffffff });

		// Zones révélées en noir : pas de fog là, même si elles se chevauchent
		for (const polygon of fog.revealed) {
			if (polygon.length < 3) continue;
			const points = polygon.flatMap((p) => [p.x, p.y]);
			this.fogMask.poly(points).fill({ color: 0x000000 });
		}
	}

	toggle(active: boolean) {
		this.isActive = active;
		this.container.visible = active;
	}

	destroy() {
		this.fogMask.destroy();
		this.container.destroy({ children: true });
	}
}
