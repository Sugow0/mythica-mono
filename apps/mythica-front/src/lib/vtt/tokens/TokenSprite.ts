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

	private isDragging = false;
	private waypoints: { x: number; y: number }[] = [];
	private rulerGraphics = new Graphics();
	private rulerText = new Text({
		text: "",
		style: {
			fontSize: 14,
			fill: 0xffffff,
			stroke: { color: 0x000000, width: 3 },
			fontFamily: "Public Sans",
		},
	});
	private tokenWidth: number;
	private tokenHeight: number;

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
		this.tokenWidth = token.width;
		this.tokenHeight = token.height;

		this.targetX = parseFloat(token.posX) * this.gridSize;
		this.targetY = parseFloat(token.posY) * this.gridSize;

		this.container = new Container();
		this.container.x = this.targetX;
		this.container.y = this.targetY;
		this.container.visible = token.isVisible;

		this.rulerText.anchor.set(0.5);

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

	private handleKeyDown = (e: KeyboardEvent) => {
		if (e.code === "Space" && this.isDragging) {
			e.preventDefault();
			// Ajoute un waypoint à la position actuelle
			this.waypoints.push({ x: this.targetX, y: this.targetY });
			this.drawRuler();
		}
	};

	private drawRuler() {
		this.rulerGraphics.clear();
		if (this.waypoints.length === 0) return;

		const cx = (this.tokenWidth * this.gridSize) / 2;
		const cy = (this.tokenHeight * this.gridSize) / 2;

		let totalDist = 0;
		let prev = this.waypoints[0];

		this.rulerGraphics.moveTo(prev.x + cx, prev.y + cy);
		this.rulerGraphics.circle(prev.x + cx, prev.y + cy, 4).fill(0xff0000);

		for (let i = 1; i < this.waypoints.length; i++) {
			const wp = this.waypoints[i];
			this.rulerGraphics.lineTo(wp.x + cx, wp.y + cy);
			this.rulerGraphics.circle(wp.x + cx, wp.y + cy, 4).fill(0xffff00);
			const dx = wp.x - prev.x;
			const dy = wp.y - prev.y;
			totalDist += Math.sqrt(dx * dx + dy * dy);
			prev = wp;
		}

		this.rulerGraphics.lineTo(this.targetX + cx, this.targetY + cy);
		this.rulerGraphics.stroke({ color: 0xff0000, width: 3, alpha: 0.8 });
		this.rulerGraphics
			.circle(this.targetX + cx, this.targetY + cy, 4)
			.fill(0xffffff);

		const dx = this.targetX - prev.x;
		const dy = this.targetY - prev.y;
		totalDist += Math.sqrt(dx * dx + dy * dy);

		const distCells = totalDist / this.gridSize;
		const distMeters = distCells * 1.5;

		this.rulerText.text = `${distMeters.toFixed(1)} m`;
		this.rulerText.x = this.targetX + cx + 15;
		this.rulerText.y = this.targetY + cy - 15;
	}

	private onTick(ticker: Ticker) {
		if (this.isDragging) {
			this.container.x = this.targetX;
			this.container.y = this.targetY;
			return;
		}

		const dt = ticker.deltaTime;
		// Vitesse d'interpolation
		const speed = 0.1 * dt;

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

		let startMouseX = 0;
		let startMouseY = 0;
		let dragStartLocal = { x: 0, y: 0 };
		let startContainerX = this.targetX;
		let startContainerY = this.targetY;
		let lastClickTime = 0;

		this.container.on("pointerdown", (e) => {
			e.stopPropagation();
			this.isDragging = true;
			vttState.setIsTokenDragging(true);
			startMouseX = e.globalX;
			startMouseY = e.globalY;
			dragStartLocal = e.getLocalPosition(this.container.parent!);
			startContainerX = this.targetX;
			startContainerY = this.targetY;
			this.container.zIndex = 1000;

			this.waypoints = [{ x: startContainerX, y: startContainerY }];

			const canEdit =
				vttState.isGm ||
				(token.characterSheetId &&
					token.characterSheetId === vttState.myCharacterSheetId);
			if (canEdit && this.container.parent) {
				this.container.parent.addChild(this.rulerGraphics);
				this.container.parent.addChild(this.rulerText);
				this.drawRuler();
				window.addEventListener("keydown", this.handleKeyDown);
			}
		});

		this.container.on("globalpointermove", (e) => {
			if (!this.isDragging) return;
			const canEdit =
				vttState.isGm ||
				(token.characterSheetId &&
					token.characterSheetId === vttState.myCharacterSheetId);
			if (!canEdit) return;

			const localPos = e.getLocalPosition(this.container.parent!);
			const dx = localPos.x - dragStartLocal.x;
			const dy = localPos.y - dragStartLocal.y;

			this.targetX = startContainerX + dx;
			this.targetY = startContainerY + dy;

			this.drawRuler();
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const handlePointerUp = (e: any) => {
			if (!this.isDragging) return;
			this.isDragging = false;
			vttState.setIsTokenDragging(false);
			this.container.zIndex = 0;

			const canEdit =
				vttState.isGm ||
				(token.characterSheetId &&
					token.characterSheetId === vttState.myCharacterSheetId);

			if (canEdit && this.container.parent) {
				this.container.parent.removeChild(this.rulerGraphics);
				this.container.parent.removeChild(this.rulerText);
				window.removeEventListener("keydown", this.handleKeyDown);
			}

			const dist =
				Math.abs(e.globalX - startMouseX) + Math.abs(e.globalY - startMouseY);

			if (dist < 5) {
				this.targetX = startContainerX;
				this.targetY = startContainerY;
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

				const gridX = snap
					? Math.round(finalX / this.gridSize)
					: finalX / this.gridSize;
				const gridY = snap
					? Math.round(finalY / this.gridSize)
					: finalY / this.gridSize;

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
		window.removeEventListener("keydown", this.handleKeyDown);
		if (this.rulerGraphics.parent) {
			this.rulerGraphics.parent.removeChild(this.rulerGraphics);
		}
		if (this.rulerText.parent) {
			this.rulerText.parent.removeChild(this.rulerText);
		}
		this.rulerGraphics.destroy();
		this.rulerText.destroy();
		this.container.destroy({ children: true });
	}
}
