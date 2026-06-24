import { Assets, Container, Sprite } from "pixi.js";
import type { MapConfig } from "../types";

export class BackgroundLayer {
	private container: Container;
	private sprite: Sprite | null = null;

	constructor(stage: Container) {
		this.container = new Container();
		stage.addChild(this.container);
	}

	async setMap(config: MapConfig) {
		if (this.sprite) {
			this.container.removeChild(this.sprite);
			this.sprite.destroy();
			this.sprite = null;
		}

		if (!config.fileId) return;

		try {
			const texture = await Assets.load(`/api/files/${config.fileId}`);
			this.sprite = new Sprite(texture);
			this.sprite.width = config.widthPx;
			this.sprite.height = config.heightPx;
			this.container.addChild(this.sprite);
		} catch {
			// Image non disponible, on ignore
		}
	}

	destroy() {
		this.sprite?.destroy();
		this.container.destroy({ children: true });
	}
}
