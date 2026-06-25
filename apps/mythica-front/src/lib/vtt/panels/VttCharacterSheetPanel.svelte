<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";
	import CharacterSheetViewer from "$lib/components/character-sheet/character-sheet-viewer.svelte";
	import { campaignService } from "$lib/index.js";
	import XIcon from "@lucide/svelte/icons/x";

	let { campaignId }: { campaignId: string } = $props();

	const selectedToken = $derived(
		vttState.tokens.find((t) => t.id === vttState.selectedTokenId)
	);
	const sheetId = $derived(selectedToken?.characterSheetId);

	function close() {
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
			campaignService.postMessage(campaignId, msg).catch(() => {});
		}
	}
</script>

{#if sheetId}
	<div
		class="fixed bottom-4 right-80 top-4 z-40 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
	>
		<div
			class="flex items-center justify-between border-b border-slate-700 p-3"
		>
			<h2 class="text-sm font-semibold text-slate-200">
				{selectedToken?.label ?? "Fiche de personnage"}
			</h2>
			<button
				onclick={close}
				class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
			>
				<XIcon class="h-4 w-4" />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto">
			<CharacterSheetViewer {sheetId} onRoll={handleRoll} />
		</div>
	</div>
{/if}
