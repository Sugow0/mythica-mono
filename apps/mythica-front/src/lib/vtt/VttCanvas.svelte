<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type { MapConfig } from "./types";
	import { vttState } from "./vtt.svelte";

	let {
		mapConfig,
		onTokenMove,
		onFogPaint,
	}: {
		mapConfig: MapConfig | null;
		onTokenMove?: (tokenId: string, x: number, y: number) => void;
		onFogPaint?: (polygon: { x: number; y: number }[]) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();

	type AnyLayer = {
		setMap?: (c: MapConfig) => Promise<void> | void;
		setGrid?: (c: MapConfig) => void;
		setFog?: (f: typeof vttState.fog, c: MapConfig) => void;
		syncTokens?: (t: typeof vttState.tokens) => void;
		setTokens?: (t: typeof vttState.tokens) => void;
		setGridSize?: (size: number) => void;
		destroy: () => void;
	};

	let bgLayer: AnyLayer | null = null;
	let gridLayer: AnyLayer | null = null;
	let tokensLayer: AnyLayer | null = null;
	let fogLayer: AnyLayer | null = null;
	let appDestroy: (() => void) | null = null;
	let panZoomCleanup: (() => void) | null = null;
	let mounted = $state(false);

	// Fog drawing overlay state
	let fogDrawing = $state(false);
	let fogPreview = $state({ left: 0, top: 0, width: 0, height: 0 });
	let fogStartClient = { x: 0, y: 0 }; // mutable ref utilisé dans setupPanZoom

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
			{ FogLayer },
		] = await Promise.all([
			import("pixi.js"),
			import("./layers/BackgroundLayer"),
			import("./layers/GridLayer"),
			import("./layers/TokensLayer"),
			import("./layers/FogLayer"),
		]);

		const app = new Application();
		await app.init({
			canvas: canvasEl,
			resizeTo: canvasEl,
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
		fogLayer = new FogLayer(stage);

		if (mapConfig) {
			await bgLayer.setMap!(mapConfig);
			gridLayer.setGrid!(mapConfig);
			fogLayer.setFog!(vttState.fog, mapConfig);
			tl.setGridSize(mapConfig.gridSize);
		}

		tokensLayer.setTokens!(vttState.tokens);

		panZoomCleanup = setupPanZoom(app, stage);
		appDestroy = () => app.destroy(false, { children: true });
		mounted = true;
	});

	// Effet carte : réagit au changement de mapConfig
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

	// Effet fog : se met à jour même sans map (utilise de grandes dimensions par défaut)
	$effect(() => {
		if (!mounted || !fogLayer?.setFog) return;
		const fogConfig = mapConfig ?? { widthPx: 20000, heightPx: 20000 };
		fogLayer.setFog(vttState.fog, fogConfig as never);
	});

	onDestroy(() => {
		panZoomCleanup?.();
		appDestroy?.();
		bgLayer = null;
		gridLayer = null;
		tokensLayer = null;
		fogLayer = null;
		stageRef = null;
	});

	function screenToWorld(
		clientX: number,
		clientY: number
	): { x: number; y: number } {
		if (!canvasEl || !stageRef) return { x: 0, y: 0 };
		const rect = canvasEl.getBoundingClientRect();
		const cx = clientX - rect.left;
		const cy = clientY - rect.top;
		return {
			x: (cx - stageRef.x) / stageRef.scale.x,
			y: (cy - stageRef.y) / stageRef.scale.y,
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
		}

		// Gestionnaire unique mousedown sur le canvas — délègue selon l'outil actif
		function onMouseDown(e: MouseEvent) {
			const tool = vttState.selectedToolId;
			const isFogTool = tool === "fog-paint" || tool === "fog-erase";

			// Pan : clic molette ou alt+clic gauche, sauf en mode fog
			if (!isFogTool && (e.button === 1 || (e.button === 0 && e.altKey))) {
				dragging = true;
				lastX = e.clientX;
				lastY = e.clientY;
				return;
			}

			// Fog drawing : clic gauche sans alt
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

					if (tool === "fog-erase") {
						onFogPaint?.([]);
						return;
					}
					const tl = screenToWorld(
						Math.min(ev.clientX, fogStartClient.x),
						Math.min(ev.clientY, fogStartClient.y)
					);
					const br = screenToWorld(
						Math.max(ev.clientX, fogStartClient.x),
						Math.max(ev.clientY, fogStartClient.y)
					);
					if (Math.abs(br.x - tl.x) < 5 || Math.abs(br.y - tl.y) < 5) return;
					onFogPaint?.([
						{ x: tl.x, y: tl.y },
						{ x: br.x, y: tl.y },
						{ x: br.x, y: br.y },
						{ x: tl.x, y: br.y },
					]);
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
	class="absolute inset-0"
	style="cursor: {vttState.selectedToolId === 'fog-paint' ||
	vttState.selectedToolId === 'fog-erase'
		? 'crosshair'
		: 'default'}"
>
	<canvas bind:this={canvasEl} class="block h-full w-full"></canvas>

	{#if fogDrawing}
		<div
			class="pointer-events-none absolute border-2 border-dashed {vttState.selectedToolId ===
			'fog-paint'
				? 'border-green-400 bg-green-400/10'
				: 'border-red-400 bg-red-400/10'}"
			style="left: {fogPreview.left -
				(canvasEl?.getBoundingClientRect().left ?? 0)}px; top: {fogPreview.top -
				(canvasEl?.getBoundingClientRect().top ??
					0)}px; width: {fogPreview.width}px; height: {fogPreview.height}px"
		></div>
	{/if}
</div>
