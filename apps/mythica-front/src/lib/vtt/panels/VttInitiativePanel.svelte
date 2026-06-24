<script lang="ts">
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
	class="absolute right-2 top-14 w-48 rounded-lg bg-slate-900/90 border border-slate-700 p-3 z-10"
>
	<h3
		class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
	>
		Initiative — Tour {combatState.round}
	</h3>
	<ul class="space-y-1">
		{#each combatState.order as participantId, i (participantId)}
			<li
				class="text-xs rounded px-2 py-1 {i === combatState.activeIndex
					? 'bg-red-600 text-white'
					: 'text-slate-300'}"
			>
				{participantId.slice(0, 8)}
			</li>
		{/each}
	</ul>
	{#if isGm}
		<button
			class="mt-2 w-full px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
			onclick={nextTurn}
		>
			Tour suivant
		</button>
	{/if}
</div>
