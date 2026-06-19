<script lang="ts">
	import type {
		CharacterBuilder,
		SpellcastingClassInfo,
	} from "$lib/character-builder/builder.svelte";
	import type { ContentItem } from "$lib/api/services/character-service";
	import { Badge } from "$lib/components/ui/badge";
	import * as Card from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";

	let { builder }: { builder: CharacterBuilder } = $props();

	const ABILITY_LABELS: Record<string, string> = {
		force: "Force",
		dexterite: "Dextérité",
		constitution: "Constitution",
		intelligence: "Intelligence",
		sagesse: "Sagesse",
		charisme: "Charisme",
	};

	type SpellData = { level?: number; school?: string; classes?: string[] };
	const spellData = (s: ContentItem) => (s.data ?? {}) as SpellData;

	/** Sorts d'une classe : tours de magie + sorts de niveau ≤ maxSpellLevel. */
	function classSpells(classSlug: string, maxLevel: number) {
		const all = (builder.content.sort ?? []).filter((s) =>
			(spellData(s).classes ?? []).includes(classSlug)
		);
		return {
			cantrips: all.filter((s) => (spellData(s).level ?? 0) === 0),
			leveled: all.filter((s) => {
				const l = spellData(s).level ?? 0;
				return l >= 1 && l <= maxLevel;
			}),
		};
	}

	/** Regroupe des sorts par niveau (croissant). */
	function byLevel(spells: ContentItem[]): [number, ContentItem[]][] {
		const groups: Record<number, ContentItem[]> = {};
		for (const s of spells) (groups[spellData(s).level ?? 0] ??= []).push(s);
		return Object.entries(groups)
			.map(([l, list]) => [Number(l), list] as [number, ContentItem[]])
			.sort((a, b) => a[0] - b[0]);
	}

	type Pool = "cantrips" | "spells" | "spellbook";
	function selectionFor(slug: string) {
		return (
			builder.spellSelections[slug] ?? {
				cantrips: [],
				spells: [],
				spellbook: [],
			}
		);
	}

	// Initialise une entrée par classe lanceuse (une fois).
	$effect(() => {
		let changed = false;
		const next = { ...builder.spellSelections };
		for (const info of builder.spellcastingClasses) {
			if (!next[info.slug]) {
				next[info.slug] = { cantrips: [], spells: [], spellbook: [] };
				changed = true;
			}
		}
		if (changed) builder.spellSelections = next;
	});

	function toggle(slug: string, pool: Pool, spell: string, limit: number) {
		const sel = selectionFor(slug);
		const arr = sel[pool];
		let updated: typeof sel;
		if (arr.includes(spell)) {
			const removed = arr.filter((x) => x !== spell);
			updated = { ...sel, [pool]: removed };
			// retirer un sort du grimoire le retire aussi des sorts préparés
			if (pool === "spellbook") {
				updated.spells = updated.spells.filter((x) => x !== spell);
			}
		} else {
			if (arr.length >= limit) return;
			updated = { ...sel, [pool]: [...arr, spell] };
		}
		builder.spellSelections = { ...builder.spellSelections, [slug]: updated };
	}

	const SCHOOL_BADGE = (s: string | undefined) => s ?? "";

	// Classes lanceuses qui ont effectivement quelque chose à choisir.
	const active = $derived(
		builder.spellcastingClasses.filter(
			(i) => i.cantripsLimit > 0 || i.maxSpellLevel > 0
		)
	);
</script>

<div class="mx-auto max-w-3xl space-y-6">
	{#if active.length === 0}
		<p class="text-muted-foreground text-sm">
			Aucun sort à choisir à ce niveau pour vos classes.
		</p>
	{/if}

	{#each active as info (info.slug)}
		{@const spells = classSpells(info.slug, info.maxSpellLevel)}
		{@const sel = selectionFor(info.slug)}
		{@const isWizard = info.kind === "wizard"}
		{@const isPact = info.kind === "pact"}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<Card.Title class="font-display text-xl">{info.name}</Card.Title>
					<span class="text-muted-foreground text-xs">
						Incantation : {ABILITY_LABELS[info.ability] ?? info.ability}
					</span>
				</div>
				{#if isPact && builder.spellSlots.pact}
					<Card.Description>
						Magie de pacte : {builder.spellSlots.pact.count} emplacement(s) de niveau
						{builder.spellSlots.pact.slotLevel}, récupérés sur repos court ou
						long.
					</Card.Description>
				{/if}
			</Card.Header>

			<Card.Content class="space-y-5">
				<!-- Tours de magie -->
				{#if info.cantripsLimit > 0}
					{@const remaining = info.cantripsLimit - sel.cantrips.length}
					<div>
						<div class="mb-2 flex items-center justify-between">
							<p
								class="text-muted-foreground text-xs font-semibold uppercase tracking-wide"
							>
								Tours de magie
							</p>
							<Badge variant={remaining === 0 ? "secondary" : "default"}>
								{sel.cantrips.length}/{info.cantripsLimit}
							</Badge>
						</div>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each spells.cantrips as spell (spell.slug)}
								{@const checked = sel.cantrips.includes(spell.slug)}
								{@const disabled = !checked && remaining === 0}
								<label
									class="flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors
										{checked ? 'border-primary bg-primary/5' : ''}
										{disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/40'}"
								>
									<Checkbox
										{checked}
										{disabled}
										onCheckedChange={() =>
											toggle(
												info.slug,
												"cantrips",
												spell.slug,
												info.cantripsLimit
											)}
									/>
									{spell.name}
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Grimoire (magicien) -->
				{#if isWizard && info.maxSpellLevel > 0}
					{@const remaining = info.spellbookLimit - sel.spellbook.length}
					<div>
						<div class="mb-2 flex items-center justify-between">
							<p
								class="text-muted-foreground text-xs font-semibold uppercase tracking-wide"
							>
								Grimoire
							</p>
							<Badge variant={remaining <= 0 ? "secondary" : "default"}>
								{sel.spellbook.length}/{info.spellbookLimit}
							</Badge>
						</div>
						{#each byLevel(spells.leveled) as [lvl, list] (lvl)}
							<p class="text-muted-foreground mt-2 mb-1 text-xs font-medium">
								Niveau {lvl}
							</p>
							<div class="grid gap-2 sm:grid-cols-2">
								{#each list as spell (spell.slug)}
									{@const checked = sel.spellbook.includes(spell.slug)}
									{@const disabled = !checked && remaining <= 0}
									<label
										class="flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors
											{checked ? 'border-primary bg-primary/5' : ''}
											{disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/40'}"
									>
										<Checkbox
											{checked}
											{disabled}
											onCheckedChange={() =>
												toggle(
													info.slug,
													"spellbook",
													spell.slug,
													info.spellbookLimit
												)}
										/>
										{spell.name}
									</label>
								{/each}
							</div>
						{/each}
					</div>
				{/if}

				<!-- Sorts connus / préparés (préparés du grimoire pour le magicien) -->
				{#if info.maxSpellLevel > 0}
					{@const source = isWizard
						? spells.leveled.filter((s) => sel.spellbook.includes(s.slug))
						: spells.leveled}
					{@const remaining = info.spellsLimit - sel.spells.length}
					<div>
						<div class="mb-2 flex items-center justify-between">
							<p
								class="text-muted-foreground text-xs font-semibold uppercase tracking-wide"
							>
								{info.spellsLabel}{isWizard ? " (depuis le grimoire)" : ""}
							</p>
							<Badge variant={remaining <= 0 ? "secondary" : "default"}>
								{sel.spells.length}/{info.spellsLimit}
							</Badge>
						</div>
						{#if isWizard && source.length === 0}
							<p class="text-muted-foreground text-sm">
								Ajoutez d'abord des sorts à votre grimoire.
							</p>
						{/if}
						{#each byLevel(source) as [lvl, list] (lvl)}
							<p class="text-muted-foreground mt-2 mb-1 text-xs font-medium">
								Niveau {lvl}
							</p>
							<div class="grid gap-2 sm:grid-cols-2">
								{#each list as spell (spell.slug)}
									{@const checked = sel.spells.includes(spell.slug)}
									{@const disabled = !checked && remaining <= 0}
									{@const school = SCHOOL_BADGE(spellData(spell).school)}
									<label
										class="flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors
											{checked ? 'border-primary bg-primary/5' : ''}
											{disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/40'}"
									>
										<Checkbox
											{checked}
											{disabled}
											onCheckedChange={() =>
												toggle(
													info.slug,
													"spells",
													spell.slug,
													info.spellsLimit
												)}
										/>
										<span class="min-w-0">
											{spell.name}
											{#if school}
												<Badge
													variant="outline"
													class="ml-1 align-middle text-[10px]"
												>
													{school}
												</Badge>
											{/if}
										</span>
									</label>
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/each}
</div>
