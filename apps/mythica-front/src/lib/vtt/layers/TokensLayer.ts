import { Application, Container, Graphics, Text } from "pixi.js";
import type { SessionTokenDto } from "../types";

export class TokensLayer {
	private container: Container;
	private app: Application;
	private tokenSprites: Map<string, Container> = new Map();

	constructor(stage: Container, app: Application) {
		this.container = new Container();
		this.app = app;
		stage.addChild(this.container);
	}

	setTokens(tokens: SessionTokenDto[]) {
		// Clear all existing tokens
		this.tokenSprites.forEach((sprite) => sprite.destroy({ children: true }));
		this.tokenSprites.clear();

		for (const token of tokens) {
			this.addTokenSprite(token);
		}
	}

	syncTokens(tokens: SessionTokenDto[]) {
		const incoming = new Set(tokens.map((t) => t.id));

		// Remove tokens no longer present
		for (const [id, sprite] of this.tokenSprites) {
			if (!incoming.has(id)) {
				sprite.destroy({ children: true });
				this.tokenSprites.delete(id);
			}
		}

		// Add or update tokens
		for (const token of tokens) {
			if (this.tokenSprites.has(token.id)) {
				const sprite = this.tokenSprites.get(token.id)!;
				sprite.x = parseFloat(token.posX);
				sprite.y = parseFloat(token.posY);
				sprite.visible = token.isVisible;
			} else {
				this.addTokenSprite(token);
			}
		}
	}

	private addTokenSprite(token: SessionTokenDto) {
		const container = new Container();
		container.x = parseFloat(token.posX);
		container.y = parseFloat(token.posY);
		container.visible = token.isVisible;

		const bg = new Graphics();
		bg.rect(0, 0, token.width, token.height)
			.fill({ color: 0x3b82f6, alpha: 0.8 })
			.stroke({ width: 2, color: 0xffffff });
		container.addChild(bg);

		if (token.label) {
			const label = new Text({
				text: token.label,
				style: { fontSize: 12, fill: 0xffffff },
			});
			label.x = token.width / 2 - label.width / 2;
			label.y = token.height + 2;
			container.addChild(label);
		}

		this.container.addChild(container);
		this.tokenSprites.set(token.id, container);
	}

	destroy() {
		this.tokenSprites.forEach((s) => s.destroy({ children: true }));
		this.container.destroy({ children: true });
	}
}
