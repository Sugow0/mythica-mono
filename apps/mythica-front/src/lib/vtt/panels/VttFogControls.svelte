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
	class="fixed bottom-4 left-4 z-50 rounded-[1.5rem] border border-border/40 bg-background/70 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 ease-out"
>
	<div class="flex items-center gap-2 mb-3">
		<div
			class="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg
			>
		</div>
		<p class="text-xs font-semibold uppercase tracking-wider text-foreground">
			Brouillard
		</p>
	</div>
	<div class="flex items-center gap-3">
		<button
			onclick={clearFog}
			class="rounded-xl border border-border/30 bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary active:scale-95 shadow-sm"
		>
			Tout masquer
		</button>
		{#if vttState.selectedTokenId}
			<button
				onclick={revealAroundToken}
				class="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-sm"
			>
				Révéler (Token)
			</button>
		{/if}
		<div class="ml-2 flex items-center gap-2 border-l border-border/30 pl-3">
			<span class="text-[10px] text-muted-foreground uppercase tracking-wider"
				>Mode</span
			>
			<span
				class="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-primary border border-border/20 shadow-sm"
			>
				{vttState.fog.mode}
			</span>
		</div>
	</div>
</div>
