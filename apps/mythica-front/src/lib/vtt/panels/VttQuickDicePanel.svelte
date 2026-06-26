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
	class="fixed bottom-20 left-1/2 z-40 w-80 -translate-x-1/2 flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-background/70 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 ease-out"
>
	<div
		class="flex items-center justify-between border-b border-border/30 px-4 py-3"
	>
		<div class="flex items-center gap-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				<DicesIcon class="h-4 w-4" />
			</div>
			<h2 class="text-sm font-medium tracking-tight text-foreground">
				Lancer rapide
			</h2>
		</div>
		<button
			onclick={onClose}
			class="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>
	<div class="p-4 flex flex-col gap-4">
		<div class="flex items-center gap-3">
			<label
				class="text-xs text-muted-foreground flex flex-col gap-1.5 w-1/2 font-medium"
			>
				Nombre
				<input
					type="number"
					min="1"
					max="20"
					bind:value={count}
					class="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
				/>
			</label>
			<label
				class="text-xs text-muted-foreground flex flex-col gap-1.5 w-1/2 font-medium"
			>
				Modificateur
				<input
					type="number"
					bind:value={modifier}
					class="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
				/>
			</label>
		</div>

		<div class="flex items-center gap-2">
			<label
				class="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
			>
				<input
					type="checkbox"
					bind:checked={isPrivate}
					class="rounded border-border/50 bg-background/50 text-primary focus:ring-primary/50 focus:ring-offset-0 transition-colors"
				/>
				Jet privé (MJ uniquement)
			</label>
		</div>

		<div class="grid grid-cols-4 gap-2">
			{#each diceTypes as dice (dice)}
				<button
					onclick={() => roll(dice)}
					class="flex items-center justify-center rounded-xl border border-border/20 bg-secondary/40 py-2.5 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md active:scale-[0.97]"
				>
					d{dice}
				</button>
			{/each}
		</div>
	</div>
</div>
