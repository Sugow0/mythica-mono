<script lang="ts">
	import DicesIcon from "@lucide/svelte/icons/dices";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import { Button } from "$lib/components/ui/button";

	let rollResult = $state<number | null>(null);
	let isRolling = $state(false);

	function rollDice() {
		isRolling = true;
		rollResult = null;

		// Simulate network/physics delay
		setTimeout(() => {
			rollResult = Math.floor(Math.random() * 20) + 1;
			isRolling = false;
		}, 800);
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
			Simulez des lancers de dés réalistes pour vos parties en ligne.
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
					Configuration
				</h2>

				<div class="space-y-4">
					<div>
						<label
							class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
							>Type de dé</label
						>
						<div class="grid grid-cols-3 gap-2">
							{#each ["D4", "D6", "D8", "D10", "D12", "D20"] as dice}
								<button
									class="rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-border dark:bg-background dark:text-muted-foreground dark:hover:border-red-900 dark:hover:bg-red-950/30"
								>
									{dice}
								</button>
							{/each}
						</div>
					</div>

					<div>
						<label
							class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
							>Quantité</label
						>
						<input
							type="number"
							value="1"
							min="1"
							max="100"
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-border dark:bg-background"
						/>
					</div>

					<div>
						<label
							class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
							>Modificateur</label
						>
						<input
							type="number"
							value="0"
							class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-border dark:bg-background"
						/>
					</div>
				</div>
			</div>

			<Button
				class="w-full h-12 text-lg bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-all hover:scale-[1.02]"
				onclick={rollDice}
				disabled={isRolling}
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

				<div class="relative z-10 text-center">
					{#if isRolling}
						<div class="mb-4 inline-block animate-spin">
							<DicesIcon class="h-16 w-16 text-slate-400" />
						</div>
						<p class="text-xl font-medium text-slate-500">
							Calcul de la physique...
						</p>
					{:else if rollResult !== null}
						<div
							class="mb-2 text-8xl font-black text-slate-900 dark:text-white drop-shadow-sm animate-in zoom-in duration-300"
						>
							<span
								class={rollResult === 20
									? "text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]"
									: ""}
							>
								{rollResult}
							</span>
						</div>
						<p class="text-lg font-medium text-slate-500">
							{#if rollResult === 20}
								Réussite Critique !
							{:else if rollResult === 1}
								Échec Critique...
							{:else}
								Total du lancer
							{/if}
						</p>
					{:else}
						<DicesIcon
							class="mx-auto mb-4 h-16 w-16 text-slate-300 dark:text-slate-700"
						/>
						<p class="text-lg font-medium text-slate-400">
							La zone de lancer 3D apparaîtra ici
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
