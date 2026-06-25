<script lang="ts">
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";
	import { campaignService } from "$lib/index.js";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import XIcon from "@lucide/svelte/icons/x";
	import DicesIcon from "@lucide/svelte/icons/dices";

	let {
		ws,
		campaignId,
		onClose,
	}: {
		ws: VttWebSocket | null;
		campaignId: string;
		onClose: () => void;
	} = $props();

	const diceTypes = [4, 6, 8, 10, 12, 20, 100];
	let modifier = $state(0);
	let count = $state(1);
	let isPrivate = $state(false);

	function roll(faces: number) {
		const rolls = [];
		let total = modifier;
		for (let i = 0; i < count; i++) {
			const r = Math.floor(Math.random() * faces) + 1;
			rolls.push(r);
			total += r;
		}

		const formula = `${count}d${faces}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""}`;
		const sign = modifier > 0 ? "+" : modifier < 0 ? "-" : "";
		const modStr = modifier !== 0 ? ` ${sign} ${Math.abs(modifier)}` : "";
		const msg = `🎲 Jet de dés (${formula}) : ${rolls.join(" + ")}${modStr} = **${total}** ${isPrivate ? "(Privé)" : ""}`;

		if (isPrivate) {
			vttState.addDiceRoll({
				formula,
				results: rolls,
				total,
				isPrivate,
				rollerId: vttState.participants[0] || "Unknown",
			});
		} else {
			if (ws) {
				ws.send({
					type: "DICE_ROLL",
					formula,
					results: rolls,
					total,
					isPrivate,
				});
			}
			campaignService.postMessage(campaignId, msg).catch(() => {});
		}
	}
</script>

<div
	class="fixed bottom-20 left-1/2 z-40 w-72 -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
>
	<div class="flex items-center justify-between border-b border-slate-700 p-3">
		<h2 class="flex items-center gap-2 text-sm font-semibold text-slate-200">
			<DicesIcon class="h-4 w-4 text-red-500" />
			Lancer rapide
		</h2>
		<button
			onclick={onClose}
			class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>
	<div class="p-4 flex flex-col gap-4">
		<div class="flex items-center gap-3">
			<label class="text-xs text-slate-400 flex flex-col gap-1 w-1/2">
				Nombre
				<input
					type="number"
					min="1"
					max="20"
					bind:value={count}
					class="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white focus:border-red-500 focus:outline-none"
				/>
			</label>
			<label class="text-xs text-slate-400 flex flex-col gap-1 w-1/2">
				Modificateur
				<input
					type="number"
					bind:value={modifier}
					class="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white focus:border-red-500 focus:outline-none"
				/>
			</label>
		</div>

		<div class="flex items-center gap-2">
			<label class="flex items-center gap-2 text-xs text-slate-300">
				<input
					type="checkbox"
					bind:checked={isPrivate}
					class="rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-600 focus:ring-offset-slate-900"
				/>
				Jet privé (MJ uniquement)
			</label>
		</div>

		<div class="grid grid-cols-4 gap-2">
			{#each diceTypes as dice (dice)}
				<button
					onclick={() => roll(dice)}
					class="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm font-bold text-slate-300 transition-colors hover:border-red-500 hover:bg-red-900/20 hover:text-red-400"
				>
					d{dice}
				</button>
			{/each}
		</div>
	</div>
</div>
