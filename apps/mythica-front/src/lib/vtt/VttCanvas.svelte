<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type { MapConfig } from "./types";
	import { vttState } from "./vtt.svelte";

	let {
		mapConfig,
		onTokenMove,
		onDropToken,
		onFogPaint,
		onFogHide,
	}: {
		mapConfig: MapConfig | null;
		onTokenMove?: (tokenId: string, x: number, y: number) => void;
		onDropToken?: (
			sheetId: string,
			label: string,
			fileId: string | null,
			gridX: number,
			gridY: number
		) => void;
		onFogPaint?: (polygon: { x: number; y: number }[]) => void;
		onFogHide?: (polygon: { x: number; y: number }[]) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let fogCanvasEl: HTMLCanvasElement | undefined = $state();

	type AnyLayer = {
		setMap?: (c: MapConfig) => Promise<void> | void;
		setGrid?: (c: MapConfig) => void;
		syncTokens?: (t: typeof vttState.tokens) => void;
		setTokens?: (t: typeof vttState.tokens) => void;
		setGridSize?: (size: number) => void;
		destroy: () => void;
	};

	let bgLayer: AnyLayer | null = null;
	let gridLayer: AnyLayer | null = null;
	let tokensLayer: AnyLayer | null = null;
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
		] = await Promise.all([
			import("pixi.js"),
			import("./layers/BackgroundLayer"),
			import("./layers/GridLayer"),
			import("./layers/TokensLayer"),
		]);

		const app = new Application();
		await app.init({
			canvas: canvasEl,
			// resizeTo: window pour couvrir tout le viewport, indépendamment du CSS
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
		const tl = new TokensLayer(stage, app);
		if (onTokenMove) tl.setOnMove(onTokenMove);
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
		const cfg = mapConfig ?? { widthPx: 20000, heightPx: 20000 };
		const sx = cfg.widthPx * stage.scale.x;
		const sy = cfg.heightPx * stage.scale.y;

		// Fond sombre = brouillard sur toute la map
		ctx.globalCompositeOperation = "source-over";
		ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
		ctx.fillRect(stage.x, stage.y, sx, sy);

		// Zones révélées : destination-out perce des trous dans le fog
		ctx.globalCompositeOperation = "destination-out";
		for (const polygon of vttState.fog.revealed) {
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
		}
	});

	// Effet tokens
	$effect(() => {
		if (!mounted || !tokensLayer) return;
		tokensLayer.syncTokens!(vttState.tokens);
	});

	onDestroy(() => {
		panZoomCleanup?.();
		appDestroy?.();
		bgLayer = null;
		gridLayer = null;
		tokensLayer = null;
		stageRef = null;
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

			// Pan : molette, alt+clic, ou clic gauche en mode non-fog/non-ruler
			if (
				!vttState.isTokenDragging &&
				(e.button === 1 ||
					(e.button === 0 && e.altKey) ||
					(e.button === 0 && !isFogTool && !isRulerTool))
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
		token.posX = newX;
		token.posY = newY;

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
	style="cursor: {vttState.selectedToolId === 'fog-paint' ||
	vttState.selectedToolId === 'fog-erase'
		? 'crosshair'
		: 'grab'}"
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
				x={(rulerStartClient.x + rulerCurrentClient.x) / 2}
				y={(rulerStartClient.y + rulerCurrentClient.y) / 2 - 12}
				fill="white"
				stroke="black"
				stroke-width="1"
				font-size="14"
				text-anchor="middle"
				font-family="Public Sans"
				font-weight="bold"
			>
				{rulerDistanceText}
			</text>
		</svg>
	{/if}
</div>
