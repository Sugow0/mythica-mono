<script lang="ts">
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type { ContentItem } from "$lib/api/services/character-service";
	import * as Card from "$lib/components/ui/card";

	let { builder }: { builder: CharacterBuilder } = $props();

	type SubclassData = {
		acquisitionLevel?: number;
		features?: { level: number; name: string; description: string }[];
	};
	const data = (s: ContentItem) => (s.data ?? {}) as SubclassData;

	const classLevel = (classSlug: string) =>
		builder.classes.find((c) => c.slug === classSlug)?.level ?? 1;

	function select(classSlug: string, slug: string) {
		builder.subclassSelections = {
			...builder.subclassSelections,
			[classSlug]: slug,
		};
	}

	/** Aptitudes obtenues au niveau actuel de la classe. */
	function features(item: ContentItem, classSlug: string) {
		const lvl = classLevel(classSlug);
		return (data(item).features ?? [])
			.filter((f) => f.level <= lvl)
			.sort((a, b) => a.level - b.level);
	}
</script>

<div class="mx-auto max-w-3xl space-y-6">
	{#each builder.subclassChoices as group (group.classSlug)}
		<div class="space-y-3">
			<p
				class="text-muted-foreground text-xs font-semibold uppercase tracking-wide"
			>
				{group.className}
			</p>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each group.subclasses as sub (sub.slug)}
					{@const active =
						builder.subclassSelections[group.classSlug] === sub.slug}
					<button
						type="button"
						onclick={() => select(group.classSlug, sub.slug)}
						aria-pressed={active}
						class="rounded-xl border bg-card p-4 text-left transition-colors
							{active
							? 'border-primary ring-primary bg-primary/5 ring-1'
							: 'hover:border-primary/40 hover:bg-muted/40'}"
					>
						<p class="font-display font-semibold">{sub.name}</p>
						{#if sub.description}
							<p class="text-muted-foreground mt-1 text-sm">
								{sub.description}
							</p>
						{/if}
					</button>
				{/each}
			</div>

			{#if builder.subclassSelections[group.classSlug]}
				{@const chosen = group.subclasses.find(
					(s) => s.slug === builder.subclassSelections[group.classSlug]
				)}
				{#if chosen}
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display text-lg">{chosen.name}</Card.Title
							>
						</Card.Header>
						<Card.Content>
							<ul class="space-y-2">
								{#each features(chosen, group.classSlug) as f (f.name)}
									<li class="text-sm">
										<span class="font-medium">{f.name}</span>
										<span class="text-muted-foreground text-xs">
											(niv {f.level})</span
										>
										<span class="text-muted-foreground">
											— {f.description}</span
										>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/if}
			{/if}
		</div>
	{/each}
</div>
