<script lang="ts">
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";
	import { vttState } from "$lib/vtt/vtt.svelte";

	let { ws }: { ws: VttWebSocket | null } = $props();

	function clearFog() {
		ws?.send({ type: "FOG_CLEAR" });
	}

	function revealAroundToken() {
		if (!vttState.selectedTokenId) return;
		ws?.send({
			type: "FOG_REVEAL_AROUND",
			tokenId: vttState.selectedTokenId,
			radius: 6, // Rayon en cases (par exemple 6 cases = 9 mètres dans D&D)
		});
	}
</script>

<div
	class="fixed bottom-4 left-4 z-50 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur"
>
	<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
		Brouillard
	</p>
	<div class="flex gap-2">
		<button
			onclick={clearFog}
			class="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white transition-colors hover:bg-red-700"
		>
			Tout masquer
		</button>
		{#if vttState.selectedTokenId}
			<button
				onclick={revealAroundToken}
				class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-700"
			>
				Révéler (Token)
			</button>
		{/if}
		<span class="self-center text-xs text-slate-500">
			Mode : <strong class="text-slate-300">{vttState.fog.mode}</strong>
		</span>
	</div>
</div>
