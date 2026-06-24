<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";

	let { ws }: { ws: VttWebSocket | null } = $props();

	function clearFog() {
		ws?.send({ type: "FOG_CLEAR" });
	}
</script>

<div class="absolute left-2 bottom-2 flex flex-col gap-1 z-10">
	<span
		class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1"
		>Brouillard</span
	>
	<span class="text-xs text-slate-500">Mode : {vttState.fog.mode}</span>
	<button
		class="px-2 py-1 rounded text-xs bg-slate-800/80 text-slate-300 hover:bg-slate-700"
		onclick={clearFog}
	>
		Tout masquer
	</button>
</div>
