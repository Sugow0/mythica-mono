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
import { vttState } from "../vtt.svelte";

export type TokenMoveCallback = (tokenId: string, x: number, y: number) => void;
export type TokenSelectCallback = (tokenId: string) => void;

export class TokenSprite {
	public container: Container;
	private sprite: Sprite | Graphics;
	private label: Text | null = null;
	public tokenId: string;
	private gridSize: number;

	constructor(
		token: SessionTokenDto,
		onMove: TokenMoveCallback,
		onSelect: TokenSelectCallback,
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

		this.makeDraggable(onMove, onSelect, token);
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

	private makeDraggable(
		onMove: TokenMoveCallback,
		onSelect: TokenSelectCallback,
		token: SessionTokenDto
	) {
		this.container.eventMode = "static";
		this.container.cursor = "pointer";

		let isDragging = false;
		let startMouseX = 0; // For click detection only
		let startMouseY = 0;
		let dragStartLocal = { x: 0, y: 0 };
		let startContainerX = this.container.x;
		let startContainerY = this.container.y;

		const rulerGraphics = new Graphics();
		const rulerText = new Text({
			text: "",
			style: {
				fontSize: 14,
				fill: 0xffffff,
				stroke: { color: 0x000000, width: 3 },
				fontFamily: "Public Sans",
			},
		});
		rulerText.anchor.set(0.5);

		this.container.on("pointerdown", (e) => {
			e.stopPropagation();
			isDragging = true;
			vttState.setIsTokenDragging(true);
			startMouseX = e.globalX;
			startMouseY = e.globalY;
			dragStartLocal = e.getLocalPosition(this.container.parent);
			startContainerX = this.container.x;
			startContainerY = this.container.y;
			this.container.zIndex = 1000;

			this.container.addChild(rulerGraphics);
			this.container.addChild(rulerText);
		});

		this.container.on("globalpointermove", (e) => {
			if (!isDragging) return;
			const localPos = e.getLocalPosition(this.container.parent);
			const dx = localPos.x - dragStartLocal.x;
			const dy = localPos.y - dragStartLocal.y;
			this.container.x = startContainerX + dx;
			this.container.y = startContainerY + dy;

			// Dessin de la règle de mesure
			const cx = (token.width * this.gridSize) / 2;
			const cy = (token.height * this.gridSize) / 2;
			rulerGraphics.clear();
			rulerGraphics.moveTo(-dx + cx, -dy + cy);
			rulerGraphics.lineTo(cx, cy);
			rulerGraphics.stroke({ color: 0xff0000, width: 3, alpha: 0.8 });
			// Dessin des cercles aux extrémités
			rulerGraphics.circle(-dx + cx, -dy + cy, 4).fill(0xffffff);
			rulerGraphics.circle(cx, cy, 4).fill(0xff0000);

			const distPixels = Math.sqrt(dx * dx + dy * dy);
			const distCells = distPixels / this.gridSize;
			const distMeters = distCells * 1.5; // 1 case = 1.5m

			rulerText.text = `${distMeters.toFixed(1)} m`;
			rulerText.x = -dx / 2 + cx;
			rulerText.y = -dy / 2 + cy - 12;
		});

		this.container.on("pointerup", (e) => {
			if (!isDragging) return;
			isDragging = false;
			vttState.setIsTokenDragging(false);
			this.container.zIndex = 0;

			this.container.removeChild(rulerGraphics);
			this.container.removeChild(rulerText);

			const dist =
				Math.abs(e.globalX - startMouseX) + Math.abs(e.globalY - startMouseY);
			if (dist < 5) {
				onSelect(token.id);
			} else {
				const snap = !e.shiftKey;
				const gridX = snap
					? Math.round(this.container.x / this.gridSize)
					: this.container.x / this.gridSize;
				const gridY = snap
					? Math.round(this.container.y / this.gridSize)
					: this.container.y / this.gridSize;
				onMove(token.id, gridX, gridY);
			}
		});

		this.container.on("pointerupoutside", (e) => {
			if (!isDragging) return;
			isDragging = false;
			vttState.setIsTokenDragging(false);
			this.container.zIndex = 0;

			this.container.removeChild(rulerGraphics);
			this.container.removeChild(rulerText);

			const snap = !e.shiftKey;
			const gridX = snap
				? Math.round(this.container.x / this.gridSize)
				: this.container.x / this.gridSize;
			const gridY = snap
				? Math.round(this.container.y / this.gridSize)
				: this.container.y / this.gridSize;
			onMove(token.id, gridX, gridY);
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
