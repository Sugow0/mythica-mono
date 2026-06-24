<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";

	let { isGm, ws: _ws }: { isGm: boolean; ws: VttWebSocket | null } = $props();

	type ToolId = "select" | "move" | "fog-paint" | "fog-erase" | "add-token";

	const tools: { id: ToolId; label: string; gmOnly?: boolean }[] = [
		{ id: "select", label: "Sélection" },
		{ id: "move", label: "Déplacement" },
		{ id: "fog-paint", label: "Brouillard +", gmOnly: true },
		{ id: "fog-erase", label: "Brouillard -", gmOnly: true },
		{ id: "add-token", label: "Ajouter token", gmOnly: true },
	];

	const visibleTools = $derived(tools.filter((t) => !t.gmOnly || isGm));
</script>

<div class="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
	{#each visibleTools as tool (tool.id)}
		<button
			class="px-2 py-1 rounded text-xs font-medium transition-colors {vttState.selectedToolId ===
			tool.id
				? 'bg-red-600 text-white'
				: 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}"
			onclick={() => vttState.setTool(tool.id)}
		>
			{tool.label}
		</button>
	{/each}
</div>
