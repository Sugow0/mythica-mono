<script lang="ts">
	import type { CombatState } from "$lib/vtt/types";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import SkipForwardIcon from "@lucide/svelte/icons/skip-forward";

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

	function getTokenInfo(entry: string) {
		const token = vttState.tokens.find(
			(t) => t.id === entry || t.label === entry
		);
		return {
			label: token?.label || entry,
			fileId: token?.fileId || null,
			id: token?.id || null,
		};
	}
</script>

<div
	class="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
>
	<!-- Manche indicator -->
	<div
		class="rounded-full border border-slate-700/50 bg-slate-900/80 px-4 py-1 text-xs font-semibold text-slate-300 shadow-md backdrop-blur"
	>
		Manche <span class="text-crimson-400">{combatState.round}</span>
	</div>

	<!-- Timeline track -->
	<div
		class="relative flex items-center gap-2 rounded-2xl border border-slate-700/50 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-md"
	>
		{#each combatState.order as entry, i (entry + i)}
			{@const info = getTokenInfo(entry)}
			{@const isActive = i === combatState.activeIndex}

			<div class="flex items-center gap-2">
				<button
					class="group relative flex flex-col items-center gap-1 transition-all duration-300 {isActive
						? 'scale-110'
						: 'opacity-70 hover:scale-105 hover:opacity-100'}"
					onclick={() => info.id && vttState.setFocusedTokenId(info.id)}
				>
					<div
						class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors {isActive
							? 'border-crimson-500 shadow-[0_0_15px_rgba(225,29,72,0.6)]'
							: 'border-slate-600 bg-slate-800 group-hover:border-slate-400'}"
					>
						{#if info.fileId}
							<img
								src={`/api/gameplay/files/${info.fileId}/content`}
								alt={info.label}
								class="h-full w-full rounded-full object-cover"
							/>
						{:else}
							<span class="text-sm font-bold text-slate-300"
								>{info.label.substring(0, 2).toUpperCase()}</span
							>
						{/if}

						{#if isActive}
							<div
								class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-crimson-500 text-white shadow"
							>
								<ChevronRightIcon class="h-3 w-3" />
							</div>
						{/if}
					</div>
					<!-- Nom sous le portrait (affiché uniquement si actif) -->
					{#if isActive}
						<span
							class="absolute -bottom-5 w-max text-[10px] font-bold text-crimson-400 drop-shadow-md"
						>
							{info.label}
						</span>
					{/if}
				</button>

				<!-- Separator -->
				{#if i < combatState.order.length - 1}
					<div class="h-px w-4 bg-slate-700"></div>
				{/if}
			</div>
		{/each}

		{#if isGm && combatState.started}
			<div class="ml-2 border-l border-slate-700/50 pl-4">
				<button
					onclick={nextTurn}
					class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-crimson-600 hover:text-white"
					title="Tour suivant"
				>
					<SkipForwardIcon class="h-4 w-4" />
				</button>
			</div>
		{/if}
	</div>
</div>
