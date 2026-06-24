// apps/mythica-front/src/lib/vtt/layers/BackgroundLayer.ts
import { Assets, Container, Sprite, Texture } from "pixi.js";
import type { MapConfig } from "../types";

export class BackgroundLayer {
	private container: Container;
	private sprite: Sprite | null = null;

	constructor(stage: Container) {
		this.container = new Container();
		stage.addChildAt(this.container, 0);
	}

	async setMap(config: MapConfig) {
		this.sprite?.destroy();
		this.sprite = null;

		if (!config.fileId) {
			// Fond uni sombre si pas d'image
			return;
		}

		try {
			// L'URL est construite par le gateway — adapter selon l'implémentation réelle.
			// Chercher comment les URLs des fichiers sont construites dans la codebase (ex: avatars).
			const url = `/api/gameplay/files/${config.fileId}/content`;
			const texture: Texture = await Assets.load(url);
			this.sprite = new Sprite(texture);
			this.sprite.width = config.widthPx;
			this.sprite.height = config.heightPx;
			this.container.addChild(this.sprite);
		} catch {
			// Image non chargeable : fond uni
		}
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
