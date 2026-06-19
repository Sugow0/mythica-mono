<script lang="ts">
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type { CreationStep } from "$lib/api/services/character-service";
	import { Button } from "$lib/components/ui/button";

	let { builder, step }: { builder: CharacterBuilder; step: CreationStep } =
		$props();

	const config = $derived(
		step.config as { collectionKey: string; maxEntries?: number }
	);
	const classItems = $derived(builder.content[config.collectionKey] ?? []);
	const name = (slug: string) =>
		classItems.find((c) => c.slug === slug)?.name ?? slug;

	const available = $derived(
		classItems.filter((c) => !builder.classes.some((s) => s.slug === c.slug))
	);
	const canAdd = $derived(
		builder.classes.length < (config.maxEntries ?? 3) && available.length > 0
	);

	function setLevel(slug: string, level: number) {
		if (level < 1 || level > 20) return;
		builder.classes = builder.classes.map((c) =>
			c.slug === slug ? { ...c, level } : c
		);
	}

	function addClass(slug: string) {
		if (!slug) return;
		builder.classes = [
			...builder.classes,
			{ slug, level: 1, isPrimary: false },
		];
	}

	function removeClass(slug: string) {
		const next = builder.classes.filter((c) => c.slug !== slug);
		// garantit au moins une classe principale
		if (next.length > 0 && !next.some((c) => c.isPrimary))
			next[0].isPrimary = true;
		builder.classes = next;
	}
</script>

<div class="mx-auto max-w-2xl space-y-4">
	<p class="text-muted-foreground text-sm">
		Définissez le niveau de votre personnage. Ajoutez une seconde classe pour le
		multiclassage (les prérequis sont vérifiés à la finalisation).
	</p>

	{#each builder.classes as cls (cls.slug)}
		<div
			class="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
		>
			<div class="min-w-0 flex-1">
				<p class="font-display font-semibold">{name(cls.slug)}</p>
				{#if cls.isPrimary}
					<p class="text-primary text-xs font-medium">Classe principale</p>
				{/if}
			</div>
			<label class="flex items-center gap-2 text-sm">
				Niveau
				<input
					type="number"
					min="1"
					max="20"
					value={cls.level}
					oninput={(e) => setLevel(cls.slug, Number(e.currentTarget.value))}
					class="border-input bg-background h-9 w-16 rounded-md border px-2 text-center"
				/>
			</label>
			{#if builder.classes.length > 1}
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8"
					onclick={() => removeClass(cls.slug)}
				>
					<Trash2Icon class="h-4 w-4" />
				</Button>
			{/if}
		</div>
	{/each}

	{#if canAdd}
		<div class="flex items-center gap-2">
			<PlusIcon class="text-muted-foreground h-4 w-4" />
			<select
				class="border-input bg-background h-9 flex-1 rounded-md border px-2 text-sm"
				onchange={(e) => {
					addClass(e.currentTarget.value);
					e.currentTarget.value = "";
				}}
			>
				<option value="">Ajouter une classe (multiclassage)…</option>
				{#each available as item (item.slug)}
					<option value={item.slug}>{item.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="text-right text-sm">
		Niveau total :
		<span class="font-display text-xl font-bold text-primary"
			>{builder.totalLevel}</span
		>
	</div>
</div>
