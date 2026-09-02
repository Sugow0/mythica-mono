<script lang="ts">
	import CopyIcon from "@lucide/svelte/icons/copy";
	import PenToolIcon from "@lucide/svelte/icons/pen-tool";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import { Button } from "$lib/components/ui/button";

	const categories = [
		{ id: "elf", name: "Elfes", icon: "🧝", active: true },
		{ id: "dwarf", name: "Nains", icon: "🧔", active: false },
		{ id: "human", name: "Humains", icon: "👤", active: false },
		{ id: "orc", name: "Orcs", icon: "👹", active: false },
		{ id: "tavern", name: "Tavernes", icon: "🍺", active: false },
		{ id: "city", name: "Villes", icon: "🏰", active: false },
	];

	let generatedNames = $state([
		"Aelrindel",
		"Faenor",
		"Lyra",
		"Thranduil",
		"Elora",
		"Sylmaril",
		"Galion",
		"Naivara",
	]);

	let isGenerating = $state(false);

	function generate() {
		isGenerating = true;
		setTimeout(() => {
			generatedNames = [
				"Ilmadia",
				"Caelen",
				"Fëanor",
				"Aerendyl",
				"Lúthien",
				"Oropher",
				"Elrond",
				"Arwen",
			].sort(() => Math.random() - 0.5);
			isGenerating = false;
		}, 400);
	}
</script>

<div class="mx-auto max-w-5xl px-4 py-12">
	<div class="mb-12 text-center">
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-600/20"
		>
			<PenToolIcon class="h-8 w-8 text-white" />
		</div>
		<h1
			class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
		>
			Générateur de Noms
		</h1>
		<p
			class="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-muted-foreground"
		>
			Ne soyez plus jamais pris au dépourvu quand vos joueurs demandent le nom
			d'un PNJ aléatoire.
		</p>
	</div>

	<div class="mx-auto max-w-3xl">
		<!-- Categories -->
		<div class="mb-8 flex flex-wrap justify-center gap-3">
			{#each categories as cat}
				<button
					class="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all {cat.active
						? 'border-red-500 bg-red-50 text-red-700 shadow-sm dark:bg-red-950/50 dark:text-red-400'
						: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted'}"
				>
					<span>{cat.icon}</span>
					{cat.name}
				</button>
			{/each}
		</div>

		<!-- Big Generate Button -->
		<div class="mb-12 text-center">
			<Button
				size="lg"
				class="h-14 px-8 text-lg bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-transform hover:scale-105 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:shadow-white/10"
				onclick={generate}
				disabled={isGenerating}
			>
				<RefreshCwIcon
					class="mr-2 h-5 w-5 {isGenerating ? 'animate-spin' : ''}"
				/>
				Générer
			</Button>
		</div>

		<!-- Results -->
		<div class="grid gap-4 sm:grid-cols-2">
			{#each generatedNames as name, i}
				<div
					class="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-red-300 hover:shadow-md dark:border-border dark:bg-card animate-in fade-in slide-in-from-bottom-2"
					style="animation-delay: {i * 50}ms"
				>
					<span class="text-xl font-semibold text-slate-900 dark:text-white"
						>{name}</span
					>
					<button
						class="text-slate-400 opacity-0 transition-all hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
						title="Copier"
					>
						<CopyIcon class="h-5 w-5" />
					</button>
				</div>
			{/each}
		</div>
	</div>
</div>
