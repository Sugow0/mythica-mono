<script lang="ts">
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type {
		ContentItem,
		CreationStep,
	} from "$lib/api/services/character-service";
	import { Badge } from "$lib/components/ui/badge";

	let { builder, step }: { builder: CharacterBuilder; step: CreationStep } =
		$props();

	const config = $derived(
		step.config as {
			collectionKey: string;
			showPortrait?: boolean;
			showGrants?: boolean;
		}
	);
	const items = $derived(builder.content[config.collectionKey] ?? []);

	/** Slug sélectionné pour la collection courante. */
	const selectedSlug = $derived.by(() => {
		if (config.collectionKey === "race") return builder.raceSlug;
		if (config.collectionKey === "background") return builder.backgroundSlug;
		if (config.collectionKey === "classe")
			return builder.classes[0]?.slug ?? null;
		return null;
	});

	function select(slug: string) {
		if (config.collectionKey === "race") builder.raceSlug = slug;
		else if (config.collectionKey === "background")
			builder.backgroundSlug = slug;
		else if (config.collectionKey === "classe")
			builder.selectPrimaryClass(slug);
	}

	const active = $derived(
		items.find((i) => i.slug === selectedSlug) ?? items[0]
	);

	/** Lecture générique du `data` d'un contenu. */
	function data(item: ContentItem | undefined): Record<string, unknown> {
		return (item?.data ?? {}) as Record<string, unknown>;
	}

	const ABBR: Record<string, string> = {
		force: "FOR",
		dexterite: "DEX",
		constitution: "CON",
		intelligence: "INT",
		sagesse: "SAG",
		charisme: "CHA",
	};

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

	const abilityBonuses = $derived(
		(data(active).abilityBonuses ?? {}) as Record<string, number>
	);
	const traits = $derived(
		(data(active).traits ?? []) as { name: string; description: string }[]
	);
	const skills = $derived((data(active).skillProficiencies ?? []) as string[]);
	const languages = $derived((data(active).languages ?? []) as string[]);

	/** Résumé court des bonus pour les puces de carte. */
	function bonusSummary(item: ContentItem): string {
		const b = (data(item).abilityBonuses ?? {}) as Record<string, number>;
		return Object.entries(b)
			.map(([k, v]) => `${ABBR[k] ?? k} +${v}`)
			.join(" · ");
	}
</script>

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
	<!-- Colonne gauche : cartes de sélection -->
	<div
		class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[68vh]"
	>
		{#each items as item (item.slug)}
			{@const isActive = item.slug === selectedSlug}
			<button
				type="button"
				onclick={() => select(item.slug)}
				aria-pressed={isActive}
				class="group relative overflow-hidden rounded-xl border p-4 text-left transition-all
					{isActive
					? 'border-primary bg-primary/5 ring-1 ring-primary'
					: 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'}"
			>
				<!-- Coin « rune » de la carte active -->
				{#if isActive}
					<span
						class="absolute -right-3 -top-3 h-8 w-8 rotate-45 bg-primary/15"
						aria-hidden="true"
					></span>
				{/if}
				<div class="flex items-center gap-3">
					<span
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-display text-lg font-semibold
							{isActive
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'}"
					>
						{item.name.charAt(0)}
					</span>
					<div class="min-w-0">
						<p class="font-display text-base font-semibold leading-tight">
							{item.name}
						</p>
						{#if bonusSummary(item)}
							<p class="text-primary mt-0.5 text-xs font-medium">
								{bonusSummary(item)}
							</p>
						{/if}
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Colonne droite : portrait + lore + grants -->
	{#if active}
		<div class="lg:sticky lg:top-4 lg:self-start">
			<div class="overflow-hidden rounded-2xl border border-border bg-card">
				<!-- Cadre portrait -->
				{#if config.showPortrait !== false}
					<div
						class="relative flex h-44 items-center justify-center border-b border-border bg-gradient-to-b from-muted/60 to-card"
					>
						<span
							class="font-display text-6xl font-bold text-primary/30 select-none"
							aria-hidden="true"
						>
							{active.name.charAt(0)}
						</span>
					</div>
				{/if}

				<div class="space-y-5 p-6">
					<div>
						<h3 class="font-display text-2xl font-bold">{active.name}</h3>
						{#if active.description}
							<p class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
								{active.description}
							</p>
						{/if}
					</div>

					{#if config.showGrants !== false}
						<!-- Le « grimoire » se remplit : ce que la sélection accorde -->
						{#if Object.keys(abilityBonuses).length > 0}
							<div>
								<p
									class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide"
								>
									Bonus de caractéristiques
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each Object.entries(abilityBonuses) as [key, value] (key)}
										<Badge variant="secondary" class="font-medium">
											{ABBR[key] ?? key} +{value}
										</Badge>
									{/each}
								</div>
							</div>
						{/if}

						{#if skills.length > 0}
							<div>
								<p
									class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide"
								>
									Maîtrises accordées
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each skills as skill (skill)}
										<Badge variant="outline"
											>{SKILL_LABELS[skill] ?? skill}</Badge
										>
									{/each}
								</div>
							</div>
						{/if}

						{#if traits.length > 0}
							<div>
								<p
									class="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
								>
									<SparklesIcon class="h-3.5 w-3.5" /> Traits
								</p>
								<ul class="space-y-2">
									{#each traits as trait (trait.name)}
										<li class="text-sm">
											<span class="font-medium">{trait.name}.</span>
											<span class="text-muted-foreground"
												>{trait.description}</span
											>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if languages.length > 0}
							<p class="text-muted-foreground text-xs">
								<span class="font-medium text-foreground">Langues :</span>
								{languages.join(", ")}
							</p>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
