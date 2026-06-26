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

	let formula = $state("1d20");
	let isPrivate = $state(false);

	function addDie(faces: number) {
		if (!formula.trim()) {
			formula = `1d${faces}`;
			return;
		}

		const endMatch = /(^|[\s+-]+)(\d*)[dD](\d+)\s*$/.exec(formula);
		if (endMatch && parseInt(endMatch[3], 10) === faces) {
			const currentCount = parseInt(endMatch[2] || "1", 10);
			const index = endMatch.index + endMatch[1].length;
			formula = formula.substring(0, index) + `${currentCount + 1}d${faces}`;
		} else {
			formula = `${formula.trim()} + 1d${faces}`;
		}
	}

	function addMod(val: number) {
		if (!formula.trim()) {
			formula = `${val}`;
			return;
		}

		const endMatch = /(^|[\s+-]+)(\d+)\s*$/.exec(formula);
		if (endMatch) {
			const currentVal = parseInt(endMatch[2], 10);
			const signStr = endMatch[1].replace(/\s/g, "");
			const sign = signStr === "-" ? -1 : 1;
			const totalMod = sign * currentVal + val;

			const index = endMatch.index;
			let prefix = formula.substring(0, index).trimEnd();

			if (totalMod === 0) {
				if (prefix.endsWith("+") || prefix.endsWith("-")) {
					prefix = prefix.substring(0, prefix.length - 1).trimEnd();
				}
				formula = prefix;
			} else if (!prefix) {
				formula = `${totalMod}`;
			} else {
				formula = `${prefix} ${totalMod > 0 ? "+" : "-"} ${Math.abs(totalMod)}`;
			}
		} else {
			formula = `${formula.trim()} ${val >= 0 ? "+" : "-"} ${Math.abs(val)}`;
		}
	}

	function parseAndRoll() {
		if (!formula.trim()) return;

		const re = /([+-]?)\s*(?:(\d*)[dD](\d+)|(\d+))/g;
		let match;
		let total = 0;
		const results: number[] = [];
		let displayStr = "";
		let hasParsedAnything = false;

		const cleanFormula = formula.trim();

		while ((match = re.exec(cleanFormula)) !== null) {
			hasParsedAnything = true;
			const signStr = match[1];
			const sign = signStr === "-" ? -1 : 1;
			const isFlat = match[4] !== undefined;

			if (isFlat) {
				const mod = parseInt(match[4], 10);
				const val = sign * mod;
				total += val;

				if (displayStr.length > 0) {
					displayStr += ` ${signStr || "+"} ${mod}`;
				} else {
					displayStr += `${val}`;
				}
			} else {
				const count = parseInt(match[2] || "1", 10);
				const faces = parseInt(match[3], 10);

				const currentRolls: number[] = [];
				let currentSum = 0;
				for (let i = 0; i < count; i++) {
					const r = Math.floor(Math.random() * faces) + 1;
					currentRolls.push(r);
					currentSum += r;
				}

				const val = sign * currentSum;
				total += val;
				results.push(...currentRolls.map((r) => sign * r)); // store flat absolute or signed values

				const groupStr =
					currentRolls.length > 1
						? `[${currentRolls.join(", ")}]`
						: `${currentRolls[0]}`;

				if (displayStr.length > 0) {
					displayStr += ` ${signStr || "+"} ${groupStr}`;
				} else {
					displayStr += `${sign === -1 ? "-" : ""}${groupStr}`;
				}
			}
		}

		if (!hasParsedAnything) return;

		const msg = `🎲 Jet de dés (${cleanFormula}) : ${displayStr} = **${total}** ${isPrivate ? "(Privé)" : ""}`;

		if (isPrivate) {
			vttState.addDiceRoll({
				formula: cleanFormula,
				results: results.map(Math.abs),
				total,
				isPrivate,
				rollerId: vttState.participants[0] || "Unknown",
			});
		} else {
			if (ws) {
				ws.send({
					type: "DICE_ROLL",
					formula: cleanFormula,
					results: results.map(Math.abs),
					total,
					isPrivate,
				});
			}
			campaignService.postMessage(campaignId, msg).catch(() => {});
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			parseAndRoll();
		}
	}
</script>

<div
	class="fixed bottom-20 left-1/2 z-40 w-96 -translate-x-1/2 flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-background/70 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 ease-out"
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
				Lancer de dés
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
		<div class="flex flex-col gap-1.5">
			<label class="text-xs font-medium text-muted-foreground"
				>Formule (ex: 3d20+3d8+10)</label
			>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={formula}
					onkeydown={handleKeydown}
					placeholder="Ex: 1d20+5"
					class="flex-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
				/>
				<button
					onclick={parseAndRoll}
					class="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all"
				>
					Lancer
				</button>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<span class="text-xs font-medium text-muted-foreground"
				>Ajouter à la formule :</span
			>
			<div class="grid grid-cols-7 gap-1.5">
				{#each diceTypes as dice (dice)}
					<button
						onclick={() => addDie(dice)}
						class="flex items-center justify-center rounded-lg border border-border/20 bg-secondary/40 py-1.5 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-secondary hover:text-primary active:scale-[0.97]"
					>
						d{dice}
					</button>
				{/each}
			</div>
			<div class="grid grid-cols-6 gap-1.5 mt-1">
				{#each [1, 2, 5, -1, -2, -5] as mod (mod)}
					<button
						onclick={() => addMod(mod)}
						class="flex items-center justify-center rounded-lg border border-border/20 bg-secondary/20 py-1 text-xs font-medium text-foreground transition-all hover:bg-secondary active:scale-[0.97]"
					>
						{mod > 0 ? "+" : ""}{mod}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex items-center gap-2 mt-1">
			<label
				class="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
			>
				<input
					type="checkbox"
					bind:checked={isPrivate}
					class="rounded border-border/50 bg-background/50 text-primary focus:ring-primary/50 focus:ring-offset-0 transition-colors"
				/>
				Jet privé (MJ)
			</label>

			<button
				onclick={() => (formula = "")}
				class="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				Effacer
			</button>
		</div>
	</div>
</div>
