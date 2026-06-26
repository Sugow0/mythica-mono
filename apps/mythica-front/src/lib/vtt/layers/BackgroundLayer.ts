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
			const url = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay/files/${config.fileId}/content`;
			
			// Utiliser une balise Image manuellement pour contourner le système
			// d'extensions de PIXI.Assets qui ne trouve pas d'extension ".png"
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.src = url;
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});
			
			const texture = Texture.from(img);
			this.sprite = new Sprite(texture);
			this.sprite.width = config.widthPx;
			this.sprite.height = config.heightPx;
			this.container.addChild(this.sprite);
		} catch (err) {
			console.error("Erreur chargement image map:", err);
			// Image non chargeable : fond uni
		}
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
