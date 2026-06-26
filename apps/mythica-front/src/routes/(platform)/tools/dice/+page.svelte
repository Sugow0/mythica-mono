<script lang="ts">
	import DicesIcon from "@lucide/svelte/icons/dices";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import { Button } from "$lib/components/ui/button";

	let formula = $state("3d20 + 3d8 + 10");
	let rollResult = $state<{
		total: number;
		displayStr: string;
		cleanFormula: string;
	} | null>(null);
	let isRolling = $state(false);

	const diceTypes = [4, 6, 8, 10, 12, 20, 100];

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

	function rollDice() {
		if (!formula.trim()) return;
		isRolling = true;
		rollResult = null;

		// Simulate network/physics delay
		setTimeout(() => {
			const re = /([+-]?)\s*(?:(\d*)[dD](\d+)|(\d+))/g;
			let match;
			let total = 0;
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

			if (hasParsedAnything) {
				rollResult = { total, displayStr, cleanFormula };
			}
			isRolling = false;
		}, 800);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") rollDice();
	}
</script>

<div class="mx-auto max-w-5xl px-4 py-12">
	<div class="mb-8 text-center">
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/20"
		>
			<DicesIcon class="h-8 w-8 text-white" />
		</div>
		<h1
			class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
		>
			Lancer de Dés 3D
		</h1>
		<p class="mt-4 text-lg text-slate-600 dark:text-muted-foreground">
			Simulez des lancers de dés réalistes pour vos parties en ligne avec des
			formules complexes.
		</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Tools sidebar -->
		<div class="space-y-6">
			<div
				class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card"
			>
				<h2
					class="mb-4 font-bold text-slate-900 dark:text-white flex items-center gap-2"
				>
					<SettingsIcon class="h-5 w-5 text-slate-400" />
					Configuration du lancer
				</h2>

				<div class="space-y-6">
					<div>
						<label
							class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
							>Formule (ex: 3d20 + 3d8 + 10)</label
						>
						<input
							type="text"
							bind:value={formula}
							onkeydown={handleKeydown}
							placeholder="Ex: 3d20+10"
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-border dark:bg-background"
						/>
					</div>

					<div>
						<label
							class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
							>Ajouter des dés</label
						>
						<div class="grid grid-cols-4 gap-2">
							{#each diceTypes as dice}
								<button
									onclick={() => addDie(dice)}
									class="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-border dark:bg-background dark:text-muted-foreground dark:hover:border-red-900 dark:hover:bg-red-950/30"
								>
									d{dice}
								</button>
							{/each}
						</div>
					</div>

					<div>
						<label
							class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
							>Ajouter des modificateurs</label
						>
						<div class="grid grid-cols-4 gap-2">
							{#each [1, 2, 5, 10, -1, -2, -5, -10] as mod}
								<button
									onclick={() => addMod(mod)}
									class="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-border dark:bg-background dark:text-muted-foreground dark:hover:border-red-900 dark:hover:bg-red-950/30"
								>
									{mod > 0 ? "+" : ""}{mod}
								</button>
							{/each}
						</div>
					</div>

					<div class="flex justify-end">
						<button
							onclick={() => (formula = "")}
							class="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
						>
							Effacer la formule
						</button>
					</div>
				</div>
			</div>

			<Button
				class="w-full h-12 text-lg font-bold bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-all hover:scale-[1.02]"
				onclick={rollDice}
				disabled={isRolling || !formula.trim()}
			>
				{isRolling ? "Lancement en cours..." : "Lancer les dés"}
			</Button>
		</div>

		<!-- 3D Area placeholder -->
		<div class="lg:col-span-2">
			<div
				class="relative flex h-[500px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner dark:border-border dark:bg-muted/30"
			>
				<!-- Grid background -->
				<div
					class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
				></div>

				<div class="relative z-10 text-center px-8">
					{#if isRolling}
						<div class="mb-4 inline-block animate-spin">
							<DicesIcon class="h-16 w-16 text-slate-400" />
						</div>
						<p class="text-xl font-medium text-slate-500">
							Calcul de la physique...
						</p>
					{:else if rollResult !== null}
						<div
							class="mb-4 text-xl font-medium text-slate-500 dark:text-slate-400"
						>
							{rollResult.cleanFormula}
						</div>

						<div
							class="mb-6 text-8xl font-black text-slate-900 dark:text-white drop-shadow-sm animate-in zoom-in duration-300"
						>
							{rollResult.total}
						</div>

						<div
							class="text-lg font-medium text-slate-600 dark:text-slate-300 max-w-lg mx-auto bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-border/50"
						>
							{rollResult.displayStr}
						</div>
					{:else}
						<DicesIcon
							class="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-700"
						/>
						<p class="text-lg font-medium text-slate-400">
							La zone de lancer 3D apparaîtra ici
						</p>
						<p class="text-sm mt-2 text-slate-400/80">
							Tapez une formule ou utilisez les boutons pour commencer
						</p>
					{/if}
				</div>

				<div class="absolute bottom-4 right-4">
					<Button
						variant="outline"
						size="icon"
						class="rounded-full bg-white/80 backdrop-blur shadow-sm dark:bg-background/80"
						onclick={() => {
							rollResult = null;
						}}
					>
						<RotateCcwIcon class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
