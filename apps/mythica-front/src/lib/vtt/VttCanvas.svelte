<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type { MapConfig, SessionTokenDto } from "./types";
	import { vttState } from "./vtt.svelte";
	import VttTokenHud from "./panels/VttTokenHud.svelte";
	import { computeVisibilityPolygon } from "./utils/raycast";

	let {
		mapConfig,
		onTokenMove,
		onTokenDoubleClick,
		onDropToken,
		onFogPaint,
		onFogHide,
		onTokenDelete,
		onTokenUpdate,
		onWallAdd,
		onWallRemove,
	}: {
		mapConfig: MapConfig | null;
		onTokenMove?: (
			tokenId: string,
			x: number,
			y: number,
			waypoints?: { x: number; y: number }[]
		) => void;
		onTokenDoubleClick?: (tokenId: string) => void;
		onDropToken?: (
			sheetId: string,
			label: string,
			fileId: string | null,
			gridX: number,
			gridY: number
		) => void;
		onFogPaint?: (polygon: { x: number; y: number }[]) => void;
		onFogHide?: (polygon: { x: number; y: number }[]) => void;
		onTokenDelete?: (tokenId: string) => void;
		onTokenUpdate?: (
			tokenId: string,
			updates: Partial<SessionTokenDto>
		) => void;
		onWallAdd?: (
			p1X: number,
			p1Y: number,
			p2X: number,
			p2Y: number,
			type: string
		) => void;
		onWallRemove?: (x: number, y: number) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let fogCanvasEl: HTMLCanvasElement | undefined = $state();
	let hudContainerEl: HTMLDivElement | undefined = $state();

	type AnyLayer = {
		setMap?: (c: MapConfig) => Promise<void> | void;
		setGrid?: (c: MapConfig) => void;
		syncTokens?: (t: typeof vttState.tokens) => void;
		setTokens?: (t: typeof vttState.tokens) => void;
		setWalls?: (w: typeof vttState.walls) => void;
		setGridSize?: (size: number) => void;
		destroy: () => void;
	};

	let bgLayer: AnyLayer | null = null;
	let gridLayer: AnyLayer | null = null;
	let tokensLayer: AnyLayer | null = null;
	let wallsLayer: AnyLayer | null = null;
	let appRef: import("pixi.js").Application | null = null;
	let appDestroy: (() => void) | null = null;
	let panZoomCleanup: (() => void) | null = null;
	let mounted = $state(false);

	// Fog drawing overlay state
	let fogDrawing = $state(false);
	let fogPreview = $state({ left: 0, top: 0, width: 0, height: 0 });
	let fogStartClient = { x: 0, y: 0 };

	// Ruler drawing state
	let rulerDrawing = $state(false);
	let rulerStartClient = $state({ x: 0, y: 0 });
	let rulerCurrentClient = $state({ x: 0, y: 0 });
	let rulerDistanceText = $state("");

	let wallDrawing = $state(false);
	let wallStartClient = $state({ x: 0, y: 0 });
	let wallCurrentClient = $state({ x: 0, y: 0 });
	let editingPoint = $state<{ x: number; y: number } | null>(null);

	const displayWalls = $derived(
		vttState.walls.map((w) => {
			if (
				!wallDrawing ||
				vttState.selectedToolId !== "wall-move" ||
				!editingPoint ||
				!stageRef
			)
				return w;
			const isP1 =
				Number(w.p1X) === editingPoint.x && Number(w.p1Y) === editingPoint.y;
			const isP2 =
				Number(w.p2X) === editingPoint.x && Number(w.p2Y) === editingPoint.y;
			if (!isP1 && !isP2) return w;

			const wEnd = {
				x: (wallCurrentClient.x - stageRef.x) / stageRef.scale.x,
				y: (wallCurrentClient.y - stageRef.y) / stageRef.scale.y,
			};

			return {
				...w,
				p1X: isP1 ? wEnd.x : w.p1X,
				p1Y: isP1 ? wEnd.y : w.p1Y,
				p2X: isP2 ? wEnd.x : w.p2X,
				p2Y: isP2 ? wEnd.y : w.p2Y,
			};
		})
	);

	// Stage reference for coordinate conversion
	let stageRef: {
		x: number;
		y: number;
		scale: { x: number; y: number };
	} | null = null;

	onMount(async () => {
		if (!canvasEl) return;

		const [
			{ Application, Container },
			{ BackgroundLayer },
			{ GridLayer },
			{ TokensLayer },
			{ WallsLayer },
		] = await Promise.all([
			import("pixi.js"),
			import("./layers/BackgroundLayer"),
			import("./layers/GridLayer"),
			import("./layers/TokensLayer"),
			import("./layers/WallsLayer"),
		]);

		const app = new Application();
		appRef = app;
		await app.init({
			canvas: canvasEl,
			resizeTo: window,
			backgroundColor: 0x1a1a2e,
			antialias: true,
			autoDensity: true,
			resolution: window.devicePixelRatio || 1,
		});

		const stage = new Container();
		app.stage.addChild(stage);
		stageRef = stage;

		bgLayer = new BackgroundLayer(stage);
		gridLayer = new GridLayer(stage);
		wallsLayer = new WallsLayer(stage);
		const tl = new TokensLayer(stage, app, onTokenMove, onTokenDoubleClick);
		tokensLayer = tl;

		if (mapConfig) {
			await bgLayer.setMap!(mapConfig);
			gridLayer.setGrid!(mapConfig);
			tl.setGridSize(mapConfig.gridSize);
		}

		tokensLayer.setTokens!(vttState.tokens);
		drawFog();

		panZoomCleanup = setupPanZoom(app, stage);
		appDestroy = () => app.destroy(false, { children: true });
		mounted = true;
	});

	// Dessine le fog sur le canvas 2D overlay — destination-out perce des trous fiables
	function drawFog() {
		if (!fogCanvasEl) return;
		const ctx = fogCanvasEl.getContext("2d");
		if (!ctx) return;

		// Caler les dimensions du canvas 2D sur le viewport
		fogCanvasEl.width = window.innerWidth;
		fogCanvasEl.height = window.innerHeight;

		ctx.clearRect(0, 0, fogCanvasEl.width, fogCanvasEl.height);

		const stage = stageRef;
		if (!stage) return;

		// Convertir les dimensions de la map en coordonnées écran
		const cfg = mapConfig ?? { widthPx: 20000, heightPx: 20000, gridSize: 100 };
		const maxCols = Math.ceil(cfg.widthPx / cfg.gridSize);
		const maxRows = Math.ceil(cfg.heightPx / cfg.gridSize);
		const snappedWidth = maxCols * cfg.gridSize;
		const snappedHeight = maxRows * cfg.gridSize;
		const sx = snappedWidth * stage.scale.x;
		const sy = snappedHeight * stage.scale.y;

		// Fond sombre = brouillard sur toute la map
		ctx.globalCompositeOperation = "source-over";
		const fogAlpha = vttState.isGm ? 0.45 : 0.98;
		ctx.fillStyle = `rgba(10, 10, 20, ${fogAlpha})`;
		ctx.fillRect(stage.x, stage.y, sx, sy);

		// Zones révélées : destination-out perce des trous dans le fog
		ctx.globalCompositeOperation = "destination-out";

		// 1. Manuel
		const polygonsToDraw = [...vttState.fog.revealed];

		// 2. Dynamique : ligne de vue
		if (vttState.fog.mode === "dynamic" && mapConfig) {
			let tokensToCompute = [];

			if (vttState.isGm) {
				if (vttState.selectedTokenId) {
					// MJ avec token sélectionné : on ne voit que ce que ce token voit
					const t = vttState.tokens.find(
						(t) => t.id === vttState.selectedTokenId
					);
					if (t) tokensToCompute.push(t);
				} else {
					// MJ sans sélection : vision combinée de tous les joueurs (tokens avec characterSheetId)
					tokensToCompute = vttState.tokens.filter((t) => t.characterSheetId);
				}
			} else {
				// Joueur : vision combinée du groupe (tous les tokens joueurs)
				// On pourrait limiter à `t.characterSheetId === vttState.myCharacterSheetId`
				// Mais partager la vision du groupe est souvent préféré en VTT.
				tokensToCompute = vttState.tokens.filter((t) => t.characterSheetId);
			}

			const walls = displayWalls
				.filter((w) => w.type !== "invisible")
				.map((w) => ({
					p1: { x: Number(w.p1X), y: Number(w.p1Y) },
					p2: { x: Number(w.p2X), y: Number(w.p2Y) },
				}));
			const radius = 12 * mapConfig.gridSize; // Vision de 12 cases par défaut

			for (const token of tokensToCompute) {
				const origin = {
					x:
						parseFloat(token.posX as unknown as string) * mapConfig.gridSize +
						(token.width * mapConfig.gridSize) / 2,
					y:
						parseFloat(token.posY as unknown as string) * mapConfig.gridSize +
						(token.height * mapConfig.gridSize) / 2,
				};
				const losPolygon = computeVisibilityPolygon(
					origin,
					walls,
					mapConfig.widthPx,
					mapConfig.heightPx,
					radius
				);
				if (losPolygon.length > 2) {
					polygonsToDraw.push(losPolygon);
				}
			}
		}

		for (const polygon of polygonsToDraw) {
			if (polygon.length < 3) continue;
			ctx.beginPath();
			const first = polygon[0];
			// Convertir coordonnées monde → écran
			ctx.moveTo(
				first.x * stage.scale.x + stage.x,
				first.y * stage.scale.y + stage.y
			);
			for (let i = 1; i < polygon.length; i++) {
				ctx.lineTo(
					polygon[i].x * stage.scale.x + stage.x,
					polygon[i].y * stage.scale.y + stage.y
				);
			}
			ctx.closePath();
			ctx.fill();
		}
		ctx.globalCompositeOperation = "source-over";
	}

	// Recalcule le fog quand l'état change
	$effect(() => {
		if (!mounted) return;
		// Lire les dépendances réactives
		void vttState.fog;
		void displayWalls;
		void vttState.selectedTokenId;
		if (vttState.selectedTokenId) {
			const t = vttState.tokens.find((t) => t.id === vttState.selectedTokenId);
			if (t) {
				void t.posX;
				void t.posY;
			}
		}
		void mapConfig;
		drawFog();
	});

	// Effet carte
	$effect(() => {
		if (!mounted || !bgLayer || !gridLayer) return;
		if (mapConfig) {
			bgLayer.setMap!(mapConfig);
			gridLayer.setGrid!(mapConfig);
			tokensLayer?.setGridSize?.(mapConfig.gridSize);
			wallsLayer?.setGridSize?.(mapConfig.gridSize);
		}
	});

	// Effet tokens
	$effect(() => {
		if (!mounted || !tokensLayer) return;
		tokensLayer.syncTokens!(vttState.tokens);
	});

	// Effet murs
	$effect(() => {
		if (!mounted || !wallsLayer) return;
		wallsLayer.setWalls?.(displayWalls);
	});

	onDestroy(() => {
		panZoomCleanup?.();
		appDestroy?.();
		bgLayer = null;
		gridLayer = null;
		tokensLayer = null;
		wallsLayer = null;
		stageRef = null;
	});

	// Keyboard listener for token movement
	$effect(() => {
		if (!mounted) return;

		function onKeyDown(e: KeyboardEvent) {
			if (!vttState.selectedTokenId) return;
			// Ignorer si on tape dans un input
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;

			const token = vttState.tokens.find(
				(t) => t.id === vttState.selectedTokenId
			);
			if (!token || !mapConfig) return;

			let dx = 0;
			let dy = 0;

			switch (e.key) {
				case "ArrowUp":
					dy = -1;
					break;
				case "ArrowDown":
					dy = 1;
					break;
				case "ArrowLeft":
					dx = -1;
					break;
				case "ArrowRight":
					dx = 1;
					break;
				default:
					return; // Not an arrow key
			}

			// Prevent scrolling the page
			e.preventDefault();

			let newX = parseFloat(token.posX as unknown as string) + dx;
			let newY = parseFloat(token.posY as unknown as string) + dy;

			const maxCols = Math.ceil(mapConfig.widthPx / mapConfig.gridSize);
			const maxRows = Math.ceil(mapConfig.heightPx / mapConfig.gridSize);

			newX = Math.max(0, Math.min(newX, maxCols - token.width));
			newY = Math.max(0, Math.min(newY, maxRows - token.height));

			onTokenMove?.(token.id, newX, newY);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	});

	// Ticker hook to position HUD
	$effect(() => {
		if (!mounted || !hudContainerEl || !stageRef || !appRef) return;

		const updateHud = () => {
			if (!vttState.selectedTokenId) {
				if (hudContainerEl) hudContainerEl.style.display = "none";
				return;
			}

			const token = vttState.tokens.find(
				(t) => t.id === vttState.selectedTokenId
			);
			if (!token || !mapConfig || !stageRef) return;

			const worldX =
				parseFloat(token.posX as unknown as string) * mapConfig.gridSize +
				(token.width * mapConfig.gridSize) / 2;
			const worldY =
				parseFloat(token.posY as unknown as string) * mapConfig.gridSize; // top of token

			const screenX = worldX * stageRef.scale.x + stageRef.x;
			const screenY = worldY * stageRef.scale.y + stageRef.y - 12; // 12px padding above the token

			if (hudContainerEl) {
				hudContainerEl.style.display = "block";
				hudContainerEl.style.transform = `translate(${screenX}px, ${screenY}px)`;
			}
		};

		appRef.ticker.add(updateHud);
		return () => {
			if (appRef && appRef.ticker) {
				appRef.ticker.remove(updateHud);
			}
		};
	});

	// Camera focus
	$effect(() => {
		if (vttState.focusedTokenId && stageRef && appRef && mapConfig) {
			const token = vttState.tokens.find(
				(t) => t.id === vttState.focusedTokenId
			);
			if (token && canvasEl) {
				const targetX =
					parseFloat(token.posX as unknown as string) * mapConfig.gridSize +
					(token.width * mapConfig.gridSize) / 2;
				const targetY =
					parseFloat(token.posY as unknown as string) * mapConfig.gridSize +
					(token.height * mapConfig.gridSize) / 2;

				// Center the stage on these world coordinates
				const screenW = canvasEl.clientWidth;
				const screenH = canvasEl.clientHeight;

				stageRef.x = screenW / 2 - targetX * stageRef.scale.x;
				stageRef.y = screenH / 2 - targetY * stageRef.scale.y;

				// Select it
				vttState.setSelectedTokenId(token.id);
			}
			// Reset to prevent getting stuck
			vttState.setFocusedTokenId(null);
		}
	});

	function screenToWorld(
		clientX: number,
		clientY: number
	): { x: number; y: number } {
		if (!stageRef) return { x: 0, y: 0 };
		return {
			x: (clientX - stageRef.x) / stageRef.scale.x,
			y: (clientY - stageRef.y) / stageRef.scale.y,
		};
	}

	function setupPanZoom(
		app: { canvas: HTMLCanvasElement },
		stage: {
			scale: { x: number; set: (x: number, y: number) => void };
			x: number;
			y: number;
		}
	): () => void {
		let dragging = false;
		let lastX = 0;
		let lastY = 0;

		function onWheel(e: WheelEvent) {
			e.preventDefault();
			const factor = e.deltaY < 0 ? 1.1 : 0.9;
			const currentScale = stage.scale.x;
			const newScale = Math.max(0.1, Math.min(5, currentScale * factor));

			// Si le scale ne change pas (limite atteinte), on ne fait rien
			if (currentScale === newScale) return;

			// Coordonnées de la souris relatives à la fenêtre
			const mouseX = e.clientX;
			const mouseY = e.clientY;

			// Coordonnées de la souris dans le monde avant le zoom
			const worldX = (mouseX - stage.x) / currentScale;
			const worldY = (mouseY - stage.y) / currentScale;

			stage.scale.set(newScale, newScale);

			// Ajuster la position du stage pour que le point sous la souris reste au même endroit
			stage.x = mouseX - worldX * newScale;
			stage.y = mouseY - worldY * newScale;

			drawFog();
		}

		function onMouseDown(e: MouseEvent) {
			const tool = vttState.selectedToolId;
			const isFogTool = tool === "fog-paint" || tool === "fog-erase";
			const isRulerTool = tool === "ruler";
			const isWallTool =
				tool === "wall-add" || tool === "wall-remove" || tool === "wall-move";

			// Pan : molette, alt+clic, ou clic gauche en mode non-fog/non-ruler/non-wall
			if (
				!vttState.isTokenDragging &&
				(e.button === 1 ||
					(e.button === 0 && e.altKey) ||
					(e.button === 0 && !isFogTool && !isRulerTool && !isWallTool))
			) {
				dragging = true;
				lastX = e.clientX;
				lastY = e.clientY;
				return;
			}

			if (tool === "ruler" && e.button === 0 && !e.altKey) {
				e.preventDefault();
				rulerDrawing = true;
				rulerStartClient = { x: e.clientX, y: e.clientY };
				rulerCurrentClient = { x: e.clientX, y: e.clientY };
				rulerDistanceText = "0.0 m";

				function onRulerMove(ev: MouseEvent) {
					rulerCurrentClient = { x: ev.clientX, y: ev.clientY };
					const wStart = screenToWorld(rulerStartClient.x, rulerStartClient.y);
					const wEnd = screenToWorld(
						rulerCurrentClient.x,
						rulerCurrentClient.y
					);
					const dx = wEnd.x - wStart.x;
					const dy = wEnd.y - wStart.y;
					const distPixels = Math.sqrt(dx * dx + dy * dy);
					const distCells = distPixels / (mapConfig?.gridSize ?? 100);
					rulerDistanceText = `${(distCells * 1.5).toFixed(1)} m`;
				}

				function onRulerUp() {
					window.removeEventListener("mousemove", onRulerMove);
					window.removeEventListener("mouseup", onRulerUp);
					rulerDrawing = false;
				}

				window.addEventListener("mousemove", onRulerMove);
				window.addEventListener("mouseup", onRulerUp);
				return;
			}

			if (isFogTool && e.button === 0 && !e.altKey) {
				e.preventDefault();
				fogDrawing = true;
				fogStartClient = { x: e.clientX, y: e.clientY };
				fogPreview = { left: e.clientX, top: e.clientY, width: 0, height: 0 };

				function onFogMove(ev: MouseEvent) {
					fogPreview = {
						left: Math.min(ev.clientX, fogStartClient.x),
						top: Math.min(ev.clientY, fogStartClient.y),
						width: Math.abs(ev.clientX - fogStartClient.x),
						height: Math.abs(ev.clientY - fogStartClient.y),
					};
				}

				function onFogUp(ev: MouseEvent) {
					window.removeEventListener("mousemove", onFogMove);
					window.removeEventListener("mouseup", onFogUp);
					fogDrawing = false;

					const tl = screenToWorld(
						Math.min(ev.clientX, fogStartClient.x),
						Math.min(ev.clientY, fogStartClient.y)
					);
					const br = screenToWorld(
						Math.max(ev.clientX, fogStartClient.x),
						Math.max(ev.clientY, fogStartClient.y)
					);
					if (Math.abs(br.x - tl.x) < 5 || Math.abs(br.y - tl.y) < 5) return;

					const polygon = [
						{ x: tl.x, y: tl.y },
						{ x: br.x, y: tl.y },
						{ x: br.x, y: br.y },
						{ x: tl.x, y: br.y },
					];

					if (tool === "fog-erase") {
						onFogHide?.(polygon);
					} else {
						onFogPaint?.(polygon);
					}
				}

				window.addEventListener("mousemove", onFogMove);
				window.addEventListener("mouseup", onFogUp);
				return;
			}

			if (tool === "wall-add" && e.button === 0 && !e.altKey) {
				e.preventDefault();
				wallDrawing = true;
				wallStartClient = { x: e.clientX, y: e.clientY };
				wallCurrentClient = { x: e.clientX, y: e.clientY };

				function onWallMove(ev: MouseEvent) {
					wallCurrentClient = { x: ev.clientX, y: ev.clientY };
				}

				function onWallUp() {
					window.removeEventListener("mousemove", onWallMove);
					window.removeEventListener("mouseup", onWallUp);
					wallDrawing = false;

					let wStart = screenToWorld(wallStartClient.x, wallStartClient.y);
					let wEnd = screenToWorld(wallCurrentClient.x, wallCurrentClient.y);

					// Snapping pour le départ et la fin
					let bestStart = wStart;
					let bestEnd = wEnd;
					let minStartDist = 20;
					let minEndDist = 20;
					for (const w of vttState.walls) {
						// Start
						let d1 = Math.hypot(
							Number(w.p1X) - wStart.x,
							Number(w.p1Y) - wStart.y
						);
						if (d1 < minStartDist) {
							minStartDist = d1;
							bestStart = { x: Number(w.p1X), y: Number(w.p1Y) };
						}
						let d2 = Math.hypot(
							Number(w.p2X) - wStart.x,
							Number(w.p2Y) - wStart.y
						);
						if (d2 < minStartDist) {
							minStartDist = d2;
							bestStart = { x: Number(w.p2X), y: Number(w.p2Y) };
						}
						// End
						d1 = Math.hypot(Number(w.p1X) - wEnd.x, Number(w.p1Y) - wEnd.y);
						if (d1 < minEndDist) {
							minEndDist = d1;
							bestEnd = { x: Number(w.p1X), y: Number(w.p1Y) };
						}
						d2 = Math.hypot(Number(w.p2X) - wEnd.x, Number(w.p2Y) - wEnd.y);
						if (d2 < minEndDist) {
							minEndDist = d2;
							bestEnd = { x: Number(w.p2X), y: Number(w.p2Y) };
						}
					}
					wStart = bestStart;
					wEnd = bestEnd;

					// Simple dessin
					if (Math.hypot(wStart.x - wEnd.x, wStart.y - wEnd.y) < 5) return;
					onWallAdd?.(wStart.x, wStart.y, wEnd.x, wEnd.y, "normal");
				}

				window.addEventListener("mousemove", onWallMove);
				window.addEventListener("mouseup", onWallUp);
				return;
			}

			if (tool === "wall-move" && e.button === 0 && !e.altKey) {
				e.preventDefault();
				wallDrawing = true;
				wallStartClient = { x: e.clientX, y: e.clientY };
				wallCurrentClient = { x: e.clientX, y: e.clientY };

				const wStartRaw = screenToWorld(e.clientX, e.clientY);
				editingPoint = null;
				let minDist = 20;
				for (const w of vttState.walls) {
					const d1 = Math.hypot(
						Number(w.p1X) - wStartRaw.x,
						Number(w.p1Y) - wStartRaw.y
					);
					if (d1 < minDist) {
						minDist = d1;
						editingPoint = { x: Number(w.p1X), y: Number(w.p1Y) };
					}
					const d2 = Math.hypot(
						Number(w.p2X) - wStartRaw.x,
						Number(w.p2Y) - wStartRaw.y
					);
					if (d2 < minDist) {
						minDist = d2;
						editingPoint = { x: Number(w.p2X), y: Number(w.p2Y) };
					}
				}

				if (!editingPoint) {
					wallDrawing = false;
					return;
				}

				const connectedWalls = vttState.walls.filter(
					(w) =>
						(Number(w.p1X) === editingPoint!.x &&
							Number(w.p1Y) === editingPoint!.y) ||
						(Number(w.p2X) === editingPoint!.x &&
							Number(w.p2Y) === editingPoint!.y)
				);

				function onWallMoveMove(ev: MouseEvent) {
					wallCurrentClient = { x: ev.clientX, y: ev.clientY };
				}

				function onWallMoveUp() {
					window.removeEventListener("mousemove", onWallMoveMove);
					window.removeEventListener("mouseup", onWallMoveUp);
					wallDrawing = false;
					const finalPoint = editingPoint!;
					editingPoint = null;

					let wEnd = screenToWorld(wallCurrentClient.x, wallCurrentClient.y);

					// Snapping pour la fin
					let bestEnd = wEnd;
					let minEndDist = 20;
					for (const w of vttState.walls) {
						// Ne pas snapper sur le point qu'on est en train d'éditer
						if (
							Number(w.p1X) === finalPoint.x &&
							Number(w.p1Y) === finalPoint.y
						)
							continue;
						if (
							Number(w.p2X) === finalPoint.x &&
							Number(w.p2Y) === finalPoint.y
						)
							continue;

						const d1 = Math.hypot(
							Number(w.p1X) - wEnd.x,
							Number(w.p1Y) - wEnd.y
						);
						if (d1 < minEndDist) {
							minEndDist = d1;
							bestEnd = { x: Number(w.p1X), y: Number(w.p1Y) };
						}
						const d2 = Math.hypot(
							Number(w.p2X) - wEnd.x,
							Number(w.p2Y) - wEnd.y
						);
						if (d2 < minEndDist) {
							minEndDist = d2;
							bestEnd = { x: Number(w.p2X), y: Number(w.p2Y) };
						}
					}
					wEnd = bestEnd;

					let wStart = finalPoint;
					// Si on a très peu bougé, on ne fait rien
					if (Math.hypot(wStart.x - wEnd.x, wStart.y - wEnd.y) < 5) return;

					for (const w of connectedWalls) {
						onWallRemove?.(
							Number(w.p1X) + (Number(w.p2X) - Number(w.p1X)) / 2,
							Number(w.p1Y) + (Number(w.p2Y) - Number(w.p1Y)) / 2
						);

						const newP1 =
							Number(w.p1X) === wStart.x && Number(w.p1Y) === wStart.y
								? wEnd
								: { x: Number(w.p1X), y: Number(w.p1Y) };
						const newP2 =
							Number(w.p2X) === wStart.x && Number(w.p2Y) === wStart.y
								? wEnd
								: { x: Number(w.p2X), y: Number(w.p2Y) };

						setTimeout(() => {
							onWallAdd?.(newP1.x, newP1.y, newP2.x, newP2.y, w.type);
						}, 50);
					}
				}

				window.addEventListener("mousemove", onWallMoveMove);
				window.addEventListener("mouseup", onWallMoveUp);
				return;
			}

			if (tool === "wall-remove" && e.button === 0 && !e.altKey) {
				e.preventDefault();
				const wClick = screenToWorld(e.clientX, e.clientY);
				onWallRemove?.(wClick.x, wClick.y);
				return;
			}
		}

		function onMouseMove(e: MouseEvent) {
			if (!dragging) return;
			stage.x += e.clientX - lastX;
			stage.y += e.clientY - lastY;
			lastX = e.clientX;
			lastY = e.clientY;
			drawFog();
		}

		function onMouseUp() {
			dragging = false;
		}

		app.canvas.addEventListener("wheel", onWheel, { passive: false });
		app.canvas.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			app.canvas.removeEventListener("wheel", onWheel);
			app.canvas.removeEventListener("mousedown", onMouseDown);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const dataStr = e.dataTransfer?.getData("application/json");
		if (!dataStr || !onDropToken) return;
		try {
			const data = JSON.parse(dataStr);
			if (data.type === "character_sheet") {
				const { x, y } = screenToWorld(e.clientX, e.clientY);
				const gridSize = mapConfig?.gridSize ?? 100;
				// Convert to grid coordinates
				const gridX = Math.floor(x / gridSize);
				const gridY = Math.floor(y / gridSize);
				onDropToken(data.sheetId, data.label, data.fileId, gridX, gridY);
			}
		} catch (_err) {
			// ignore parse error
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement
		)
			return;
		if (!vttState.selectedTokenId) return;

		const token = vttState.tokens.find(
			(t) => t.id === vttState.selectedTokenId
		);
		if (!token) return;

		let dx = 0;
		let dy = 0;
		switch (e.key) {
			case "ArrowUp":
				dy = -1;
				break;
			case "ArrowDown":
				dy = 1;
				break;
			case "ArrowLeft":
				dx = -1;
				break;
			case "ArrowRight":
				dx = 1;
				break;
			default:
				return;
		}

		e.preventDefault();
		const newX = parseFloat(token.posX as unknown as string) + dx;
		const newY = parseFloat(token.posY as unknown as string) + dy;

		// Optimistic update locally to allow rapid keystrokes (like diagonals)
		token.posX = newX.toString();
		token.posY = newY.toString();

		if (onTokenMove) {
			onTokenMove(token.id, newX, newY);
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	role="application"
	class="fixed inset-0"
	ondragover={handleDragOver}
	ondrop={handleDrop}
	style="cursor: {['fog-paint', 'fog-erase', 'ruler', 'wall-add'].includes(
		vttState.selectedToolId
	)
		? 'crosshair'
		: ['wall-remove', 'wall-move'].includes(vttState.selectedToolId)
			? 'pointer'
			: vttState.selectedToolId === 'select' ||
				  vttState.selectedToolId === 'move'
				? 'grab'
				: 'default'};"
>
	<!-- Canvas PixiJS plein écran -->
	<canvas bind:this={canvasEl} class="block h-full w-full"></canvas>

	<!-- Canvas 2D overlay pour le fog (destination-out, sans PixiJS) -->
	<canvas bind:this={fogCanvasEl} class="pointer-events-none absolute inset-0"
	></canvas>

	<!-- Prévisualisation du rectangle en cours de dessin -->
	{#if fogDrawing}
		<div
			class="pointer-events-none absolute border-2 border-dashed {vttState.selectedToolId ===
			'fog-paint'
				? 'border-green-400 bg-green-400/10'
				: 'border-red-400 bg-red-400/10'}"
			style="left: {fogPreview.left}px; top: {fogPreview.top}px; width: {fogPreview.width}px; height: {fogPreview.height}px"
		></div>
	{/if}

	<!-- Ruler Line -->
	{#if rulerDrawing}
		<svg class="pointer-events-none absolute inset-0 z-[100] h-full w-full">
			<line
				x1={rulerStartClient.x}
				y1={rulerStartClient.y}
				x2={rulerCurrentClient.x}
				y2={rulerCurrentClient.y}
				stroke="#ef4444"
				stroke-width="3"
			/>
			<circle
				cx={rulerStartClient.x}
				cy={rulerStartClient.y}
				r="4"
				fill="white"
			/>
			<circle
				cx={rulerCurrentClient.x}
				cy={rulerCurrentClient.y}
				r="4"
				fill="#ef4444"
			/>
			<text
				x={rulerCurrentClient.x + 10}
				y={rulerCurrentClient.y - 10}
				fill="white"
				font-size="14"
				font-weight="bold"
				class="drop-shadow-md"
			>
				{rulerDistanceText}
			</text>
		</svg>
	{/if}

	<!-- Wall Drawing Line -->
	{#if wallDrawing}
		<svg class="pointer-events-none absolute inset-0 z-[100] h-full w-full">
			{#if vttState.selectedToolId === "wall-add"}
				<line
					x1={wallStartClient.x}
					y1={wallStartClient.y}
					x2={wallCurrentClient.x}
					y2={wallCurrentClient.y}
					stroke="#00ffff"
					stroke-width="4"
				/>
				<circle
					cx={wallStartClient.x}
					cy={wallStartClient.y}
					r="6"
					fill="#00ffff"
				/>
			{/if}
			<circle
				cx={wallCurrentClient.x}
				cy={wallCurrentClient.y}
				r="6"
				fill="#00ffff"
			/>
		</svg>
	{/if}

	<!-- Token HUD Container (positionné par Pixi Ticker) -->
	<div
		bind:this={hudContainerEl}
		class="pointer-events-none absolute left-0 top-0 z-[200] origin-bottom -translate-x-1/2 -translate-y-full"
		style="display: none;"
	>
		<div class="pointer-events-auto">
			{#if vttState.selectedTokenId}
				{#if vttState.tokens.find((t) => t.id === vttState.selectedTokenId)}
					<VttTokenHud
						token={vttState.tokens.find(
							(t) => t.id === vttState.selectedTokenId
						)!}
						onDelete={onTokenDelete}
						onUpdate={(updates) =>
							onTokenUpdate?.(vttState.selectedTokenId!, updates)}
					/>
				{/if}
			{/if}
		</div>
	</div>
</div>
