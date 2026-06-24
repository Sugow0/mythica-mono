<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type { MapConfig } from "./types";
	import { vttState } from "./vtt.svelte";

	let {
		mapConfig,
		onTokenMove,
	}: {
		mapConfig: MapConfig | null;
		onTokenMove?: (tokenId: string, x: number, y: number) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement | undefined = $state();

	// Layer instances — typed as unknown to avoid importing pixi.js at module level
	// (SSR-safe: all PixiJS is imported dynamically inside onMount)
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

	onMount(async () => {
		if (!canvasEl) return;

		// Dynamic import: avoids SSR crash (PixiJS touches window/document)
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

	$effect(() => {
		if (!mounted || !bgLayer || !gridLayer || !fogLayer) return;
		if (mapConfig) {
			bgLayer.setMap!(mapConfig);
			gridLayer.setGrid!(mapConfig);
			fogLayer.setFog!(vttState.fog, mapConfig);
			tokensLayer?.setGridSize?.(mapConfig.gridSize);
		}
	});

	$effect(() => {
		if (!mounted || !tokensLayer) return;
		tokensLayer.syncTokens!(vttState.tokens);
	});

	$effect(() => {
		if (!mounted || !fogLayer || !mapConfig) return;
		fogLayer.setFog!(vttState.fog, mapConfig);
	});

	onDestroy(() => {
		panZoomCleanup?.();
		appDestroy?.();
		bgLayer = null;
		gridLayer = null;
		tokensLayer = null;
		fogLayer = null;
	});

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

		function onMouseDown(e: MouseEvent) {
			if (e.button === 1 || (e.button === 0 && e.altKey)) {
				dragging = true;
				lastX = e.clientX;
				lastY = e.clientY;
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

<canvas bind:this={canvasEl} class="block h-full w-full"></canvas>
