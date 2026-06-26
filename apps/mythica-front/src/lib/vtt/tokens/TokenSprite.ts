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

export type TokenMoveCallback = (
	tokenId: string,
	x: number,
	y: number,
	waypoints?: { x: number; y: number }[]
) => void;
export type TokenSelectCallback = (tokenId: string) => void;

export class TokenSprite {
	public container: Container;
	private sprite: Sprite | Graphics;
	private label: Text | null = null;
	private hpBarBg: Graphics | null = null;
	private hpBarFg: Graphics | null = null;
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
	private mapConfig: MapConfig | null = null;

	constructor(
		token: SessionTokenDto,
		onMove: TokenMoveCallback,
		onSelect: TokenSelectCallback,
		onDoubleClick: TokenSelectCallback | undefined,
		gridSize = 100,
		ticker: Ticker,
		mapConfig: MapConfig | null = null
	) {
		this.tokenId = token.id;
		this.gridSize = gridSize;
		this.ticker = ticker;
		this.tokenWidth = token.width;
		this.tokenHeight = token.height;
		this.mapConfig = mapConfig;

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

		if (token.maxHp && token.hp !== undefined && token.hp !== null) {
			this.createOrUpdateHpBar(token);
		}

		// Charger l'image si disponible
		if (token.fileId) {
			this.loadImage(token);
		}

		this.makeDraggable(onMove, onSelect, onDoubleClick, token);

		this.ticker.add(this.onTick, this);
	}

	setMapConfig(config: MapConfig | null) {
		this.mapConfig = config;
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

		// 1. Tracer les lignes en continu
		this.rulerGraphics.moveTo(prev.x + cx, prev.y + cy);

		for (let i = 1; i < this.waypoints.length; i++) {
			const wp = this.waypoints[i];
			this.rulerGraphics.lineTo(wp.x + cx, wp.y + cy);
			const dx = wp.x - prev.x;
			const dy = wp.y - prev.y;
			totalDist += Math.sqrt(dx * dx + dy * dy);
			prev = wp;
		}

		this.rulerGraphics.lineTo(this.targetX + cx, this.targetY + cy);
		this.rulerGraphics.stroke({ color: 0xff0000, width: 3, alpha: 0.8 });

		// 2. Calculer la distance du dernier segment
		const dxFinal = this.targetX - prev.x;
		const dyFinal = this.targetY - prev.y;
		totalDist += Math.sqrt(dxFinal * dxFinal + dyFinal * dyFinal);

		// 3. Dessiner les points par dessus
		prev = this.waypoints[0];
		this.rulerGraphics.circle(prev.x + cx, prev.y + cy, 4).fill(0xff0000);
		for (let i = 1; i < this.waypoints.length; i++) {
			const wp = this.waypoints[i];
			this.rulerGraphics.circle(wp.x + cx, wp.y + cy, 4).fill(0xffff00);
		}
		this.rulerGraphics
			.circle(this.targetX + cx, this.targetY + cy, 4)
			.fill(0xffffff);

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
		// Vitesse d'interpolation ralentie pour mieux voir le chemin
		const speed = 0.08 * dt;

		this.container.x += (this.targetX - this.container.x) * speed;
		this.container.y += (this.targetY - this.container.y) * speed;

		// Si on est très proche, on s'arrête (snap)
		if (Math.abs(this.targetX - this.container.x) < 1)
			this.container.x = this.targetX;
		if (Math.abs(this.targetY - this.container.y) < 1)
			this.container.y = this.targetY;

		// Move to next waypoint if reached current target
		if (
			this.container.x === this.targetX &&
			this.container.y === this.targetY &&
			this.movementQueue.length > 0
		) {
			const next = this.movementQueue.shift()!;
			this.targetX = next.x;
			this.targetY = next.y;
		}
	}

	private async loadImage(token: SessionTokenDto) {
		try {
			const url = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay/files/${token.fileId}/content`;
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.src = url;
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});

			const texture = Texture.from(img);
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
			if (vttState.selectedToolId !== "select") return;

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

			let newTargetX = startContainerX + dx;
			let newTargetY = startContainerY + dy;

			if (this.mapConfig) {
				const snappedWidth =
					Math.ceil(this.mapConfig.widthPx / this.gridSize) * this.gridSize;
				const snappedHeight =
					Math.ceil(this.mapConfig.heightPx / this.gridSize) * this.gridSize;
				const tokenPixelWidth = this.tokenWidth * this.gridSize;
				const tokenPixelHeight = this.tokenHeight * this.gridSize;

				newTargetX = Math.max(
					0,
					Math.min(newTargetX, snappedWidth - tokenPixelWidth)
				);
				newTargetY = Math.max(
					0,
					Math.min(newTargetY, snappedHeight - tokenPixelHeight)
				);
			}

			this.targetX = newTargetX;
			this.targetY = newTargetY;

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
				let finalX = startContainerX + dx;
				let finalY = startContainerY + dy;

				if (this.mapConfig) {
					const snappedWidth =
						Math.ceil(this.mapConfig.widthPx / this.gridSize) * this.gridSize;
					const snappedHeight =
						Math.ceil(this.mapConfig.heightPx / this.gridSize) * this.gridSize;
					const tokenPixelWidth = this.tokenWidth * this.gridSize;
					const tokenPixelHeight = this.tokenHeight * this.gridSize;

					finalX = Math.max(
						0,
						Math.min(finalX, snappedWidth - tokenPixelWidth)
					);
					finalY = Math.max(
						0,
						Math.min(finalY, snappedHeight - tokenPixelHeight)
					);
				}

				const gridX = snap
					? Math.round(finalX / this.gridSize)
					: finalX / this.gridSize;
				const gridY = snap
					? Math.round(finalY / this.gridSize)
					: finalY / this.gridSize;

				// Construction des waypoints pour le backend (en coordonnées de grille)
				const finalWaypoints = this.waypoints.slice(1).map((wp) => ({
					x: snap ? Math.round(wp.x / this.gridSize) : wp.x / this.gridSize,
					y: snap ? Math.round(wp.y / this.gridSize) : wp.y / this.gridSize,
				}));

				// Lancement de l'animation locale immédiatement
				this.movementQueue = this.waypoints.slice(1).map((wp) => ({
					x: snap ? Math.round(wp.x / this.gridSize) * this.gridSize : wp.x,
					y: snap ? Math.round(wp.y / this.gridSize) * this.gridSize : wp.y,
				}));
				this.movementQueue.push({
					x: gridX * this.gridSize,
					y: gridY * this.gridSize,
				});

				// On replace physiquement le token au point de départ pour qu'il anime vers la destination
				this.container.x = startContainerX;
				this.container.y = startContainerY;
				const first = this.movementQueue.shift()!;
				this.targetX = first.x;
				this.targetY = first.y;

				onMove(
					token.id,
					gridX,
					gridY,
					finalWaypoints.length > 0 ? finalWaypoints : undefined
				);
			}
		};

		this.container.on("pointerup", handlePointerUp);
		this.container.on("pointerupoutside", handlePointerUp);
	}

	private movementQueue: { x: number; y: number }[] = [];

	update(token: SessionTokenDto & { waypoints?: { x: number; y: number }[] }) {
		const newTargetX = parseFloat(token.posX) * this.gridSize;
		const newTargetY = parseFloat(token.posY) * this.gridSize;

		// Si on a des waypoints du backend (un autre joueur a bougé le token)
		if (token.waypoints && token.waypoints.length > 0) {
			this.movementQueue = token.waypoints.map((wp) => ({
				x: wp.x * this.gridSize,
				y: wp.y * this.gridSize,
			}));
			this.movementQueue.push({ x: newTargetX, y: newTargetY });

			const first = this.movementQueue.shift()!;
			this.targetX = first.x;
			this.targetY = first.y;

			delete token.waypoints; // On consomme l'événement
		} else {
			// Calcul de la destination finale si on est en train d'animer
			const finalDestX =
				this.movementQueue.length > 0
					? this.movementQueue[this.movementQueue.length - 1].x
					: this.targetX;
			const finalDestY =
				this.movementQueue.length > 0
					? this.movementQueue[this.movementQueue.length - 1].y
					: this.targetY;

			// Si on reçoit notre propre echo WS (même destination), on ne coupe pas l'animation
			if (
				Math.abs(finalDestX - newTargetX) < 1 &&
				Math.abs(finalDestY - newTargetY) < 1
			) {
				// On laisse l'animation se terminer
			} else {
				this.targetX = newTargetX;
				this.targetY = newTargetY;
				this.movementQueue = []; // On annule l'animation en cours car nouvelle destination
			}
		}

		this.container.visible = token.isVisible;

		if (token.maxHp && token.hp !== undefined && token.hp !== null) {
			this.createOrUpdateHpBar(token);
		} else {
			this.removeHpBar();
		}
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
		this.removeHpBar();
		this.container.destroy({ children: true });
	}

	private createOrUpdateHpBar(token: SessionTokenDto) {
		const width = token.width * this.gridSize;
		const hp = token.hp ?? 0;
		const maxHp = token.maxHp ?? 1;
		const ratio = Math.max(0, Math.min(1, hp / maxHp));

		if (!this.hpBarBg) {
			this.hpBarBg = new Graphics();
			this.container.addChild(this.hpBarBg);
		}
		if (!this.hpBarFg) {
			this.hpBarFg = new Graphics();
			this.container.addChild(this.hpBarFg);
		}

		const barHeight = 6;
		const barY = token.height * this.gridSize - barHeight;

		this.hpBarBg
			.clear()
			.rect(0, barY, width, barHeight)
			.fill({ color: 0x000000, alpha: 0.8 });

		const fgColor = ratio > 0.5 ? 0x22c55e : ratio > 0.2 ? 0xeab308 : 0xef4444;
		this.hpBarFg
			.clear()
			.rect(0, barY, width * ratio, barHeight)
			.fill({ color: fgColor, alpha: 1.0 });
	}

	private removeHpBar() {
		if (this.hpBarBg) {
			this.container.removeChild(this.hpBarBg);
			this.hpBarBg.destroy();
			this.hpBarBg = null;
		}
		if (this.hpBarFg) {
			this.container.removeChild(this.hpBarFg);
			this.hpBarFg.destroy();
			this.hpBarFg = null;
		}
	}
}
