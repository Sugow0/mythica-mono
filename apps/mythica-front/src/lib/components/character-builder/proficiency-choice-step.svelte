<script lang="ts">
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Checkbox } from "$lib/components/ui/checkbox";

	let { builder }: { builder: CharacterBuilder } = $props();

	const SKILL_LABELS: Record<string, string> = {
		acrobaties: "Acrobaties",
		arcanes: "Arcanes",
		athletisme: "Athlétisme",
		discretion: "Discrétion",
		dressage: "Dressage",
		escamotage: "Escamotage",
		histoire: "Histoire",
		intimidation: "Intimidation",
		intuition: "Intuition",
		investigation: "Investigation",
		medecine: "Médecine",
		nature: "Nature",
		perception: "Perception",
		persuasion: "Persuasion",
		religion: "Religion",
		representation: "Représentation",
		survie: "Survie",
		tromperie: "Tromperie",
	};

	function data(
		slug: string | null,
		collection: string
	): Record<string, unknown> {
		const item = (builder.content[collection] ?? []).find(
			(c) => c.slug === slug
		);
		return (item?.data ?? {}) as Record<string, unknown>;
	}

	const primaryClass = $derived(builder.classes[0]?.slug ?? null);
	const skillChoices = $derived(
		(data(primaryClass, "classe").skillChoices ?? { count: 0, from: [] }) as {
			count: number;
			from: string[];
		}
	);

	/** Maîtrises déjà accordées (race + background) : non re-sélectionnables. */
	const granted = $derived([
		...new Set<string>([
			...((data(builder.raceSlug, "race").skillProficiencies ??
				[]) as string[]),
			...((data(builder.backgroundSlug, "background").skillProficiencies ??
				[]) as string[]),
		]),
	]);

	const options = $derived(
		skillChoices.from.filter((s) => !granted.includes(s))
	);
	const remaining = $derived(
		skillChoices.count - builder.skillProficiencies.length
	);

	function toggle(skill: string) {
		const has = builder.skillProficiencies.includes(skill);
		if (has) {
			builder.skillProficiencies = builder.skillProficiencies.filter(
				(s) => s !== skill
			);
		} else if (builder.skillProficiencies.length < skillChoices.count) {
			builder.skillProficiencies = [...builder.skillProficiencies, skill];
		}
	}
</script>

<div class="mx-auto max-w-2xl space-y-5">
	<div class="flex items-center justify-between">
		<p class="text-sm text-muted-foreground">
			Choisissez <span class="text-foreground font-medium"
				>{skillChoices.count}</span
			>
			compétences de classe.
		</p>
		<Badge variant={remaining === 0 ? "secondary" : "default"}>
			{remaining} restante{remaining > 1 ? "s" : ""}
		</Badge>
	</div>

	{#if granted.length > 0}
		<div>
			<p
				class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide"
			>
				Déjà accordées (race / historique)
			</p>
			<div class="flex flex-wrap gap-1.5">
				{#each granted as skill (skill)}
					<Badge variant="outline">{SKILL_LABELS[skill] ?? skill}</Badge>
				{/each}
			</div>
		</div>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		{#each options as skill (skill)}
			{@const checked = builder.skillProficiencies.includes(skill)}
			{@const disabled = !checked && remaining === 0}
			<label
				class="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors
					{checked ? 'border-primary bg-primary/5' : 'border-border'}
					{disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/40'}"
			>
				<Checkbox {checked} {disabled} onCheckedChange={() => toggle(skill)} />
				{SKILL_LABELS[skill] ?? skill}
			</label>
		{/each}
	</div>
</div>
