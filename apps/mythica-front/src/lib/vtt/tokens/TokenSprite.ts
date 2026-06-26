// apps/mythica-front/src/lib/vtt/tokens/TokenSprite.ts
import {
	Assets,
	Container,
	Graphics,
	Sprite,
	Text,
	type Texture,
	type Ticker,
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
	private ticker: Ticker;

	private targetX: number;
	private targetY: number;

	constructor(
		token: SessionTokenDto,
		onMove: TokenMoveCallback,
		onSelect: TokenSelectCallback,
		onDoubleClick: TokenSelectCallback | undefined,
		gridSize = 100,
		ticker: Ticker
	) {
		this.tokenId = token.id;
		this.gridSize = gridSize;
		this.ticker = ticker;

		this.targetX = parseFloat(token.posX) * this.gridSize;
		this.targetY = parseFloat(token.posY) * this.gridSize;

		this.container = new Container();
		this.container.x = this.targetX;
		this.container.y = this.targetY;
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

		this.makeDraggable(onMove, onSelect, onDoubleClick, token);

		this.ticker.add(this.onTick, this);
	}

	private onTick(ticker: Ticker) {
		const dt = ticker.deltaTime;
		// Vitesse d'interpolation
		const speed = 0.1 * dt; // Légèrement plus lent pour bien voir l'animation

		this.container.x += (this.targetX - this.container.x) * speed;
		this.container.y += (this.targetY - this.container.y) * speed;

		// Si on est très proche, on s'arrête (snap)
		if (Math.abs(this.targetX - this.container.x) < 0.5)
			this.container.x = this.targetX;
		if (Math.abs(this.targetY - this.container.y) < 0.5)
			this.container.y = this.targetY;
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
		onDoubleClick: TokenSelectCallback | undefined,
		token: SessionTokenDto
	) {
		this.container.eventMode = "static";
		this.container.cursor = "pointer";

		let isDragging = false;
		let startMouseX = 0; // For click detection only
		let startMouseY = 0;
		let dragStartLocal = { x: 0, y: 0 };
		let startContainerX = this.targetX;
		let startContainerY = this.targetY;
		let lastClickTime = 0;

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
			dragStartLocal = e.getLocalPosition(this.container.parent!);
			startContainerX = this.targetX;
			startContainerY = this.targetY;
			this.container.zIndex = 1000;

			const canEdit =
				vttState.isGm ||
				(token.characterSheetId &&
					token.characterSheetId === vttState.myCharacterSheetId);
			if (canEdit) {
				this.container.addChild(rulerGraphics);
				this.container.addChild(rulerText);
			}
		});

		this.container.on("globalpointermove", (e) => {
			if (!isDragging) return;
			const canEdit =
				vttState.isGm ||
				(token.characterSheetId &&
					token.characterSheetId === vttState.myCharacterSheetId);
			if (!canEdit) return;
			const localPos = e.getLocalPosition(this.container.parent!);
			const dx = localPos.x - dragStartLocal.x;
			const dy = localPos.y - dragStartLocal.y;

			// Le token suit le curseur visuellement (via this.targetX)
			this.targetX = startContainerX + dx;
			this.targetY = startContainerY + dy;

			// La règle est enfant du container.
			// Comme le container s'est déplacé de (dx, dy), l'origine de la règle (le point de départ)
			// se trouve maintenant en (-dx, -dy) par rapport au token.
			const cx = (token.width * this.gridSize) / 2;
			const cy = (token.height * this.gridSize) / 2;

			rulerGraphics.clear();
			// Point de départ (ancienne position)
			rulerGraphics.moveTo(cx - dx, cy - dy);
			// Point final (position actuelle du token)
			rulerGraphics.lineTo(cx, cy);
			rulerGraphics.stroke({ color: 0xff0000, width: 3, alpha: 0.8 });

			// Dessin des cercles aux extrémités
			rulerGraphics.circle(cx - dx, cy - dy, 4).fill(0xff0000); // Origine
			rulerGraphics.circle(cx, cy, 4).fill(0xffffff); // Token

			const distPixels = Math.sqrt(dx * dx + dy * dy);
			const distCells = distPixels / this.gridSize;
			const distMeters = distCells * 1.5; // 1 case = 1.5m

			rulerText.text = `${distMeters.toFixed(1)} m`;
			rulerText.x = cx - dx / 2;
			rulerText.y = cy - dy / 2 - 12;
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const handlePointerUp = (e: any) => {
			if (!isDragging) return;
			isDragging = false;
			vttState.setIsTokenDragging(false);
			this.container.zIndex = 0;

			const canEdit =
				vttState.isGm ||
				(token.characterSheetId &&
					token.characterSheetId === vttState.myCharacterSheetId);
			if (canEdit) {
				this.container.removeChild(rulerGraphics);
				this.container.removeChild(rulerText);
			}

			const dist =
				Math.abs(e.globalX - startMouseX) + Math.abs(e.globalY - startMouseY);

			if (dist < 5) {
				const now = Date.now();
				if (now - lastClickTime < 300) {
					onDoubleClick?.(token.id);
					lastClickTime = 0;
				} else {
					onSelect(token.id);
					lastClickTime = now;
				}
			} else if (canEdit) {
				const localPos = e.getLocalPosition(this.container.parent!);
				const dx = localPos.x - dragStartLocal.x;
				const dy = localPos.y - dragStartLocal.y;

				const snap = !e.shiftKey;
				const finalX = startContainerX + dx;
				const finalY = startContainerY + dy;

				// Repositionner temporairement à l'origine le temps que le serveur réponde
				// pour voir la "glisse" du point A au point B (ou le garder à la position finale avec snap)
				const gridX = snap
					? Math.round(finalX / this.gridSize)
					: finalX / this.gridSize;
				const gridY = snap
					? Math.round(finalY / this.gridSize)
					: finalY / this.gridSize;

				// Maj optimiste pour voir l'animation se déclencher depuis l'endroit où on a lâché vers le snap
				this.targetX = gridX * this.gridSize;
				this.targetY = gridY * this.gridSize;

				onMove(token.id, gridX, gridY);
			}
		};

		this.container.on("pointerup", handlePointerUp);
		this.container.on("pointerupoutside", handlePointerUp);
	}

	update(token: SessionTokenDto) {
		this.targetX = parseFloat(token.posX) * this.gridSize;
		this.targetY = parseFloat(token.posY) * this.gridSize;
		this.container.visible = token.isVisible;
	}

	destroy() {
		this.ticker.remove(this.onTick, this);
		this.container.destroy({ children: true });
	}
}
