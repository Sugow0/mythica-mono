<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type { MapConfig } from "./types";
	import { vttState } from "./vtt.svelte";

	let {
		mapConfig,
		onTokenMove,
		onFogPaint,
		onFogHide,
	}: {
		mapConfig: MapConfig | null;
		onTokenMove?: (tokenId: string, x: number, y: number) => void;
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
			stage.scale.set(
				Math.max(0.1, Math.min(5, stage.scale.x * factor)),
				Math.max(0.1, Math.min(5, stage.scale.x * factor))
			);
			drawFog();
		}

		function onMouseDown(e: MouseEvent) {
			const tool = vttState.selectedToolId;
			const isFogTool = tool === "fog-paint" || tool === "fog-erase";

			// Pan : molette, alt+clic, ou clic gauche en mode non-fog
			if (
				e.button === 1 ||
				(e.button === 0 && e.altKey) ||
				(e.button === 0 && !isFogTool)
			) {
				dragging = true;
				lastX = e.clientX;
				lastY = e.clientY;
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
</script>

<div
	class="fixed inset-0"
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
</div>
