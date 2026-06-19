<script lang="ts">
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type { CreationStep } from "$lib/api/services/character-service";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";

	let { builder, step }: { builder: CharacterBuilder; step: CreationStep } =
		$props();

	const config = $derived(step.config as { fields: string[] });

	const LABELS: Record<string, string> = {
		apparence: "Apparence physique",
		biographie: "Histoire",
		personnalite: "Traits de personnalité",
		liens: "Liens et relations",
		ideaux: "Idéaux",
		defauts: "Défauts",
	};
	const PLACEHOLDERS: Record<string, string> = {
		apparence: "Allure, traits marquants, tenue (sert de base au token)…",
		biographie:
			"D'où vient votre personnage, son passé, ce qui l'a mené à l'aventure…",
		personnalite: "Manières, tics, valeurs…",
		liens: "Personnes, lieux ou objets qui comptent…",
		ideaux: "Principes qui le guident…",
		defauts: "Faiblesses, peurs, vices…",
	};

	function set(field: string, value: string) {
		builder.lore = { ...builder.lore, [field]: value };
	}
</script>

<div class="mx-auto max-w-2xl space-y-5">
	<p class="text-muted-foreground text-sm">
		Donnez vie à votre personnage. Ces éléments sont optionnels mais
		enrichissent votre fiche.
	</p>
	{#each config.fields as field (field)}
		<div class="space-y-1.5">
			<Label for="lore-{field}">{LABELS[field] ?? field}</Label>
			<Textarea
				id="lore-{field}"
				value={builder.lore[field] ?? ""}
				placeholder={PLACEHOLDERS[field] ?? ""}
				rows={field === "biographie" ? 4 : 2}
				oninput={(e) => set(field, e.currentTarget.value)}
			/>
		</div>
	{/each}
</div>
