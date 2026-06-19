<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";

	let { builder }: { builder: CharacterBuilder } = $props();

	/** Libellés des étapes (parcours data-driven : map par clé d'étape). */
	const LABELS: Record<string, string> = {
		race: "Race",
		classe: "Classe",
		niveau: "Niveau",
		background: "Historique",
		caracteristiques: "Caractéristiques",
		maitrises: "Maîtrises",
		sorts: "Sorts",
		inventaire: "Équipement",
		identite: "Identité",
		lore: "Histoire",
	};

	const label = (key: string) => LABELS[key] ?? key;
</script>

<nav aria-label="Étapes de création" class="w-full">
	<ol class="flex items-center gap-1 overflow-x-auto pb-1">
		{#each builder.visibleSteps as step, i (step.stepKey)}
			{@const isCurrent = i === builder.stepIndex}
			{@const isDone = i < builder.stepIndex}
			<li class="flex items-center gap-1 shrink-0">
				<button
					type="button"
					onclick={() => builder.goTo(i)}
					disabled={i > builder.stepIndex}
					aria-current={isCurrent ? "step" : undefined}
					class="group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors
						{isCurrent
						? 'bg-primary text-primary-foreground'
						: isDone
							? 'text-foreground hover:bg-muted'
							: 'text-muted-foreground'}"
				>
					<span
						class="flex h-5 w-5 items-center justify-center rounded-full text-xs
							{isCurrent
							? 'bg-primary-foreground/20'
							: isDone
								? 'bg-primary/15 text-primary'
								: 'border border-current'}"
					>
						{#if isDone}
							<CheckIcon class="h-3 w-3" />
						{:else}
							{i + 1}
						{/if}
					</span>
					<span class="hidden sm:inline">{label(step.stepKey)}</span>
				</button>
				{#if i < builder.visibleSteps.length - 1}
					<span
						class="h-px w-4 shrink-0 {isDone ? 'bg-primary/40' : 'bg-border'}"
						aria-hidden="true"
					></span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
