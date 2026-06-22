<script lang="ts">
	import DicesIcon from "@lucide/svelte/icons/dices";
	import HeartIcon from "@lucide/svelte/icons/heart";
	import SigmaIcon from "@lucide/svelte/icons/sigma";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { formatModifier } from "$lib/utils/dnd5e";

	let { builder }: { builder: CharacterBuilder } = $props();

	const conMod = $derived(builder.conModifier);
	const breakdown = $derived(builder.hitPoints.breakdown);

	const methods: { value: "average" | "roll"; label: string; hint: string }[] =
		[
			{
				value: "average",
				label: "Moyenne fixe",
				hint: "Valeur moyenne du dé à chaque niveau (recommandé, stable).",
			},
			{
				value: "roll",
				label: "Lancer les dés",
				hint: "Tirez vos dés de vie : plus risqué, plus aléatoire.",
			},
		];

	const sourceLabel: Record<string, string> = {
		max: "Max (niveau 1)",
		average: "Moyenne",
		roll: "Lancer",
	};

	/** PV gagnés à un niveau = dé + Constitution, plancher 1. */
	const levelHp = (base: number) => Math.max(1, base + conMod);
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<p class="text-muted-foreground text-sm">
		Au niveau 1, vous obtenez le maximum de votre dé de vie. Aux niveaux
		suivants, choisissez la moyenne fixe ou lancez les dés. Le modificateur de
		Constitution ({formatModifier(conMod)}) s'ajoute à chaque niveau.
	</p>

	<!-- Choix de la méthode -->
	<div class="grid gap-3 sm:grid-cols-2">
		{#each methods as m (m.value)}
			<button
				type="button"
				onclick={() => (builder.hpMethod = m.value)}
				aria-pressed={builder.hpMethod === m.value}
				class="flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors {builder.hpMethod ===
				m.value
					? 'border-primary bg-primary/5'
					: 'hover:bg-muted/50'}"
			>
				<span class="flex items-center gap-2 font-semibold">
					{#if m.value === "roll"}
						<DicesIcon class="h-4 w-4" />
					{:else}
						<SigmaIcon class="h-4 w-4" />
					{/if}
					{m.label}
				</span>
				<span class="text-muted-foreground text-xs">{m.hint}</span>
			</button>
		{/each}
	</div>

	{#if builder.hpMethod === "roll"}
		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={() => builder.rollHitPoints()}>
				<DicesIcon class="h-4 w-4" />
				{builder.hpRollsDone ? "Relancer les dés" : "Lancer les dés"}
			</Button>
			{#if builder.hpRollsNeeded > 0 && !builder.hpRollsDone}
				<span class="text-muted-foreground text-sm">
					{builder.hpRollsNeeded} dé(s) à lancer
				</span>
			{/if}
		</div>
	{/if}

	<!-- Total -->
	<Card.Root class="border-primary/40">
		<Card.Content class="flex items-center justify-between gap-4 py-5">
			<span class="flex items-center gap-2 font-semibold">
				<HeartIcon class="text-primary h-5 w-5" />
				Points de vie maximum
			</span>
			<span class="font-display text-primary text-4xl font-bold leading-none">
				{builder.maxHp}
			</span>
		</Card.Content>
	</Card.Root>

	<!-- Détail par niveau -->
	{#if breakdown.length > 0}
		<section class="space-y-2">
			<h2
				class="text-muted-foreground text-xs font-semibold uppercase tracking-widest"
			>
				Détail par niveau
			</h2>
			<ul class="divide-border divide-y rounded-lg border">
				{#each breakdown as entry, i (i)}
					<li class="flex items-center gap-3 px-3 py-2 text-sm">
						<span class="text-muted-foreground w-16">Niveau {i + 1}</span>
						<span class="text-muted-foreground w-12 tabular-nums"
							>d{entry.hitDie}</span
						>
						<span class="flex-1 tabular-nums">
							{entry.base}
							<span class="text-muted-foreground"
								>{formatModifier(conMod)} Con</span
							>
						</span>
						<span class="text-muted-foreground w-20 text-right text-xs">
							{sourceLabel[entry.source]}
						</span>
						<span
							class="font-display w-10 text-right font-semibold tabular-nums"
						>
							{levelHp(entry.base)}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
