<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";
	import CharacterSheetViewer from "$lib/components/character-sheet/character-sheet-viewer.svelte";
	import { campaignService } from "$lib/index.js";
	import XIcon from "@lucide/svelte/icons/x";

	let {
		ws,
		campaignId,
		sheetId: explicitSheetId,
		onClose,
	}: {
		ws: VttWebSocket | null;
		campaignId: string;
		sheetId?: string | null;
		onClose?: () => void;
	} = $props();

	const selectedToken = $derived(
		vttState.tokens.find((t) => t.id === vttState.selectedTokenId)
	);
	const sheetId = $derived(
		explicitSheetId !== undefined
			? explicitSheetId
			: selectedToken?.characterSheetId
	);

	function close() {
		if (onClose) onClose();
		vttState.setSelectedTokenId(null);
	}

	function handleRoll(formula: string, label: string) {
		const match = formula.match(/(\d+)d(\d+)\s*(?:\+\s*(-?\d+))?/);
		if (match) {
			const count = parseInt(match[1]);
			const faces = parseInt(match[2]);
			const mod = match[3] ? parseInt(match[3]) : 0;
			let total = mod;
			const rolls = [];
			for (let i = 0; i < count; i++) {
				const r = Math.floor(Math.random() * faces) + 1;
				rolls.push(r);
				total += r;
			}
			const sign = mod >= 0 ? "+" : "";
			const msg = `🎲 Jet de ${label} : ${rolls.join(" + ")} ${sign}${mod} = **${total}**`;

			if (ws) {
				ws.send({
					type: "DICE_ROLL",
					formula,
					results: rolls,
					total,
					isPrivate: false,
				});
			}

			campaignService.postMessage(campaignId, msg).catch(() => {});
		}
	}

	let panelX = $state(
		typeof window !== "undefined" ? window.innerWidth - 650 : 200
	);
	let panelY = $state(50);
	let panelW = $state(600);
	let panelH = $state(
		typeof window !== "undefined" ? window.innerHeight - 100 : 800
	);

	let isDragging = false;
	let dragStart = { x: 0, y: 0, px: 0, py: 0 };

	function onPointerDown(e: PointerEvent) {
		e.preventDefault();
		isDragging = true;
		dragStart = { x: e.clientX, y: e.clientY, px: panelX, py: panelY };
		e.currentTarget?.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		panelX = dragStart.px + (e.clientX - dragStart.x);
		panelY = dragStart.py + (e.clientY - dragStart.y);
	}

	function onPointerUp(e: PointerEvent) {
		isDragging = false;
		e.currentTarget?.releasePointerCapture(e.pointerId);
	}

	let isResizing = false;
	let resizeStart = { x: 0, y: 0, w: 0, h: 0 };

	function onResizeDown(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		isResizing = true;
		resizeStart = { x: e.clientX, y: e.clientY, w: panelW, h: panelH };
		e.currentTarget?.setPointerCapture(e.pointerId);
	}

	function onResizeMove(e: PointerEvent) {
		if (!isResizing) return;
		panelW = Math.max(300, resizeStart.w + (e.clientX - resizeStart.x));
		panelH = Math.max(300, resizeStart.h + (e.clientY - resizeStart.y));
	}

	function onResizeUp(e: PointerEvent) {
		isResizing = false;
		e.currentTarget?.releasePointerCapture(e.pointerId);
	}
</script>

{#if sheetId}
	<div
		class="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
		style="left: {panelX}px; top: {panelY}px; width: {panelW}px; height: {panelH}px;"
	>
		<div
			class="flex items-center justify-between border-b border-slate-700 p-3 cursor-move touch-none select-none"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<h2 class="text-sm font-semibold text-slate-200">
				{selectedToken?.label ?? "Fiche de personnage"}
			</h2>
			<button
				onpointerdown={(e) => e.stopPropagation()}
				onclick={close}
				class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
			>
				<XIcon class="h-4 w-4" />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto">
			<CharacterSheetViewer {sheetId} onRoll={handleRoll} />
		</div>

		<!-- Resize Handle -->
		<div
			role="separator"
			aria-orientation="horizontal"
			tabindex="-1"
			class="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
			onpointerdown={onResizeDown}
			onpointermove={onResizeMove}
			onpointerup={onResizeUp}
			onpointercancel={onResizeUp}
		>
			<svg
				class="absolute bottom-1 right-1 w-3 h-3 text-slate-500 opacity-50 pointer-events-none"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M21 15l-6 6M21 9l-12 12" />
			</svg>
		</div>
	</div>
{:else if explicitSheetId === null}
	<div
		class="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
		style="left: {panelX}px; top: {panelY}px; width: {panelW}px; height: {panelH}px;"
	>
		<div
			class="flex items-center justify-between border-b border-slate-700 p-3 cursor-move touch-none select-none"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<h2 class="text-sm font-semibold text-slate-200">Fiche de personnage</h2>
			<button
				onpointerdown={(e) => e.stopPropagation()}
				onclick={close}
				class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
			>
				<XIcon class="h-4 w-4" />
			</button>
		</div>
		<div class="flex-1 p-6 text-center text-sm text-slate-400">
			Vous n'avez aucune fiche de personnage active dans cette campagne.
		</div>

		<!-- Resize Handle -->
		<div
			role="separator"
			aria-orientation="horizontal"
			tabindex="-1"
			class="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
			onpointerdown={onResizeDown}
			onpointermove={onResizeMove}
			onpointerup={onResizeUp}
			onpointercancel={onResizeUp}
		>
			<svg
				class="absolute bottom-1 right-1 w-3 h-3 text-slate-500 opacity-50 pointer-events-none"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M21 15l-6 6M21 9l-12 12" />
			</svg>
		</div>
	</div>
{/if}
