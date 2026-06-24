<script lang="ts">
	import MousePointer2Icon from "@lucide/svelte/icons/mouse-pointer-2";
	import MoveIcon from "@lucide/svelte/icons/move";
	import EraserIcon from "@lucide/svelte/icons/eraser";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";

	let { isGm, ws: _ws }: { isGm: boolean; ws: VttWebSocket | null } = $props();

	const gmTools = [
		{ id: "select" as const, icon: MousePointer2Icon, label: "Sélectionner" },
		{ id: "move" as const, icon: MoveIcon, label: "Déplacer" },
		{ id: "fog-paint" as const, icon: PlusIcon, label: "Révéler fog" },
		{ id: "fog-erase" as const, icon: EraserIcon, label: "Masquer fog" },
	];

	const playerTools = [
		{ id: "select" as const, icon: MousePointer2Icon, label: "Sélectionner" },
	];

	const tools = $derived(isGm ? gmTools : playerTools);
</script>

<div
	class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur"
>
	{#each tools as tool (tool.id)}
		<button
			onclick={() => vttState.setTool(tool.id)}
			class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {vttState.selectedToolId ===
			tool.id
				? 'bg-red-600 text-white'
				: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
			title={tool.label}
		>
			<tool.icon class="h-4 w-4" />
			<span>{tool.label}</span>
		</button>
	{/each}
</div>
