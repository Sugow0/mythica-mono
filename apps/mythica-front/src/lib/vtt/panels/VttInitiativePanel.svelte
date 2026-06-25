<script lang="ts">
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import type { CombatState } from "$lib/vtt/types";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";

	let {
		combatState,
		isGm,
		ws,
	}: {
		combatState: CombatState;
		isGm: boolean;
		ws: VttWebSocket | null;
	} = $props();

	function nextTurn() {
		ws?.send({ type: "TURN_NEXT" });
	}
</script>

<div
	class="fixed right-4 top-4 z-50 w-56 rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
>
	<div
		class="flex items-center justify-between border-b border-slate-700 px-3 py-2"
	>
		<span class="text-xs font-semibold uppercase tracking-wider text-red-500"
			>Initiative</span
		>
		<span class="text-xs text-slate-500">Manche {combatState.round}</span>
	</div>
	<ul class="max-h-64 overflow-y-auto py-1">
		{#each combatState.order as entry, i (entry)}
			<li
				class="flex items-center gap-2 px-3 py-1.5 {i ===
				combatState.activeIndex
					? 'bg-red-600/20'
					: ''}"
			>
				{#if i === combatState.activeIndex}
					<ChevronRightIcon class="h-3 w-3 shrink-0 text-red-500" />
				{:else}
					<span class="w-3 shrink-0 text-center text-xs text-slate-600"
						>{i + 1}</span
					>
				{/if}
				<span class="truncate text-sm text-slate-200">{entry}</span>
			</li>
		{/each}
	</ul>
	{#if isGm && combatState.started}
		<div class="border-t border-slate-700 p-2">
			<button
				onclick={nextTurn}
				class="w-full rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
			>
				Tour suivant
			</button>
		</div>
	{/if}
</div>
