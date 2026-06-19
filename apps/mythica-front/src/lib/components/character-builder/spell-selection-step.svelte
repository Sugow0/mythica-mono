<script lang="ts">
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type { CreationStep } from "$lib/api/services/character-service";
	import { Badge } from "$lib/components/ui/badge";
	import { Checkbox } from "$lib/components/ui/checkbox";

	let { builder, step }: { builder: CharacterBuilder; step: CreationStep } =
		$props();

	const config = $derived(step.config as { collectionKey: string });

	const classSlugs = $derived(builder.classes.map((c) => c.slug));

	/** Sorts accessibles aux classes du personnage. */
	const spells = $derived(
		(builder.content[config.collectionKey] ?? []).filter((s) => {
			const classes = ((s.data ?? {}) as { classes?: string[] }).classes ?? [];
			return classes.some((c) => classSlugs.includes(c));
		})
	);

	/** Sorts groupés par niveau. */
	const byLevel = $derived.by(() => {
		const groups: Record<number, typeof spells> = {};
		for (const s of spells) {
			const lvl = ((s.data ?? {}) as { level?: number }).level ?? 0;
			(groups[lvl] ??= []).push(s);
		}
		return Object.entries(groups)
			.map(([lvl, list]) => [Number(lvl), list] as const)
			.sort((a, b) => a[0] - b[0]);
	});

	function toggle(slug: string) {
		builder.spellSlugs = builder.spellSlugs.includes(slug)
			? builder.spellSlugs.filter((s) => s !== slug)
			: [...builder.spellSlugs, slug];
	}

	const slotsSummary = $derived(
		builder.spellSlots.slots
			.map((n, i) => (n > 0 ? `Niv ${i + 1}: ${n}` : null))
			.filter(Boolean)
			.join(" · ")
	);
</script>

<div class="mx-auto max-w-3xl space-y-5">
	<div class="rounded-xl border border-border bg-muted/30 p-4 text-sm">
		<p class="font-medium">Emplacements de sorts (calculés)</p>
		<p class="text-muted-foreground mt-1">
			{slotsSummary || "Aucun emplacement à ce niveau."}
			{#if builder.spellSlots.pact}
				· Pacte : {builder.spellSlots.pact.count} × niv {builder.spellSlots.pact
					.slotLevel}
			{/if}
		</p>
	</div>

	{#if spells.length === 0}
		<p class="text-muted-foreground text-sm">
			Aucun sort disponible pour les classes choisies.
		</p>
	{/if}

	{#each byLevel as [level, list] (level)}
		<div>
			<p
				class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide"
			>
				{level === 0 ? "Tours de magie" : `Niveau ${level}`}
			</p>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each list as spell (spell.slug)}
					{@const checked = builder.spellSlugs.includes(spell.slug)}
					{@const school = ((spell.data ?? {}) as { school?: string }).school}
					<label
						class="flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors
							{checked
							? 'border-primary bg-primary/5'
							: 'border-border'} cursor-pointer hover:bg-muted/40"
					>
						<Checkbox {checked} onCheckedChange={() => toggle(spell.slug)} />
						<span class="min-w-0">
							<span class="font-medium">{spell.name}</span>
							{#if school}
								<Badge variant="outline" class="ml-1.5 align-middle text-[10px]"
									>{school}</Badge
								>
							{/if}
						</span>
					</label>
				{/each}
			</div>
		</div>
	{/each}
</div>
