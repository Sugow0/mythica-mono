// apps/mythica-front/src/lib/vtt/tokens/TokenSprite.ts
import {
	Assets,
	Container,
	Graphics,
	Sprite,
	Text,
	type Texture,
} from "pixi.js";
import type { SessionTokenDto } from "../types";

export type TokenMoveCallback = (tokenId: string, x: number, y: number) => void;

export class TokenSprite {
	public container: Container;
	private sprite: Sprite | Graphics;
	private label: Text | null = null;
	public tokenId: string;
	private gridSize: number;

	constructor(
		token: SessionTokenDto,
		onMove: TokenMoveCallback,
		gridSize = 100
	) {
		this.tokenId = token.id;
		this.gridSize = gridSize;
		this.container = new Container();
		this.container.x = parseFloat(token.posX) * this.gridSize;
		this.container.y = parseFloat(token.posY) * this.gridSize;
		this.container.visible = token.isVisible;

		// Placeholder graphique en attendant l'image réelle
		const g = new Graphics();
		g.roundRect(
			0,
			0,
			token.width * this.gridSize,
			token.height * this.gridSize,
			8
		)
			.fill({ color: 0xdc2626, alpha: 0.85 })
			.stroke({ color: 0xffffff, alpha: 0.5, width: 2 });
		this.sprite = g;
		this.container.addChild(g);

		if (token.label) {
			this.label = new Text({
				text: token.label,
				style: { fontSize: 12, fill: 0xffffff, fontFamily: "Public Sans" },
			});
			this.label.anchor.set(0.5, 0);
			this.label.x = (token.width * this.gridSize) / 2;
			this.label.y = token.height * this.gridSize + 4;
			this.container.addChild(this.label);
		}

		// Charger l'image si disponible
		if (token.fileId) {
			this.loadImage(token);
		}

		this.makeDraggable(onMove, token);
	}

	private async loadImage(token: SessionTokenDto) {
		try {
			const url = `/api/gameplay/files/${token.fileId}/content`;
			const texture: Texture = await Assets.load(url);
			const s = new Sprite(texture);
			s.width = token.width * this.gridSize;
			s.height = token.height * this.gridSize;
			s.roundPixels = true;
			this.container.removeChild(this.sprite);
			(this.sprite as Graphics).destroy?.();
			this.sprite = s;
			this.container.addChildAt(s, 0);
		} catch {
			// garder le placeholder en cas d'erreur de chargement
		}
	}

	private makeDraggable(onMove: TokenMoveCallback, token: SessionTokenDto) {
		this.container.eventMode = "static";
		this.container.cursor = "pointer";

		let isDragging = false;
		let startMouseX = 0;
		let startMouseY = 0;
		let startContainerX = this.container.x;
		let startContainerY = this.container.y;

		this.container.on("pointerdown", (e) => {
			isDragging = true;
			startMouseX = e.globalX;
			startMouseY = e.globalY;
			startContainerX = this.container.x;
			startContainerY = this.container.y;
			this.container.zIndex = 1000;
		});

		this.container.on("pointermove", (e) => {
			if (!isDragging) return;
			const dx = e.globalX - startMouseX;
			const dy = e.globalY - startMouseY;
			this.container.x = startContainerX + dx;
			this.container.y = startContainerY + dy;
		});

		this.container.on("pointerup", () => {
			if (!isDragging) return;
			isDragging = false;
			this.container.zIndex = 0;
			// Convertir position pixel → coordonnées grille
			const gridX = this.container.x / this.gridSize;
			const gridY = this.container.y / this.gridSize;
			onMove(token.id, gridX, gridY);
		});

		this.container.on("pointerupoutside", () => {
			isDragging = false;
			this.container.zIndex = 0;
		});
	}

	update(token: SessionTokenDto) {
		this.container.x = parseFloat(token.posX) * this.gridSize;
		this.container.y = parseFloat(token.posY) * this.gridSize;
		this.container.visible = token.isVisible;
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
