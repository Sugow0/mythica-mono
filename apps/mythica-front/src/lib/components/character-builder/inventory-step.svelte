<script lang="ts">
	import CoinsIcon from "@lucide/svelte/icons/coins";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type { CreationStep } from "$lib/api/services/character-service";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { NativeSelect } from "$lib/components/ui/native-select";

	let { builder, step }: { builder: CharacterBuilder; step: CreationStep } =
		$props();

	const config = $derived(
		step.config as { collectionKey: string; currencyKey?: string }
	);
	const items = $derived(builder.content[config.collectionKey] ?? []);
	const name = (slug: string) =>
		items.find((i) => i.slug === slug)?.name ?? slug;

	function data(
		slug: string | null,
		collection: string
	): Record<string, unknown> {
		const item = (builder.content[collection] ?? []).find(
			(c) => c.slug === slug
		);
		return (item?.data ?? {}) as Record<string, unknown>;
	}

	// Équipement de départ proposé par la classe et l'historique (dédoublonné :
	// un même objet peut être suggéré par les deux sources).
	const suggested = $derived([
		...new Set([
			...((data(builder.classes[0]?.slug ?? null, "classe").startingEquipment ??
				[]) as string[]),
			...((data(builder.backgroundSlug, "background").startingEquipment ??
				[]) as string[]),
		]),
	]);

	// Pré-remplit l'inventaire avec l'équipement suggéré (une fois).
	$effect(() => {
		if (builder.inventory.length === 0 && suggested.length > 0) {
			builder.inventory = suggested.map((slug) => ({ slug, qty: 1 }));
		}
	});

	const available = $derived(
		items.filter((i) => !builder.inventory.some((inv) => inv.slug === i.slug))
	);

	function add(slug: string) {
		if (!slug) return;
		builder.inventory = [...builder.inventory, { slug, qty: 1 }];
	}
	function remove(slug: string) {
		builder.inventory = builder.inventory.filter((i) => i.slug !== slug);
	}
	function setQty(slug: string, qty: number) {
		if (qty < 1) return;
		builder.inventory = builder.inventory.map((i) =>
			i.slug === slug ? { ...i, qty } : i
		);
	}
</script>

<div class="mx-auto max-w-2xl space-y-5">
	<label
		class="bg-card text-card-foreground flex items-center gap-3 rounded-xl border p-4 shadow-xs"
	>
		<CoinsIcon class="text-primary h-5 w-5" />
		<span class="font-medium">Or de départ</span>
		<Input
			type="number"
			min="0"
			class="ml-auto w-28"
			value={builder.gold ?? 0}
			oninput={(e) => (builder.gold = Number(e.currentTarget.value))}
		/>
		<span class="text-muted-foreground text-sm">po</span>
	</label>

	<div class="space-y-2">
		{#each builder.inventory as item (item.slug)}
			<div
				class="bg-card text-card-foreground flex items-center gap-3 rounded-lg border p-3 shadow-xs"
			>
				<span class="flex-1 text-sm font-medium">{name(item.slug)}</span>
				<Input
					type="number"
					min="1"
					class="w-16"
					value={item.qty}
					oninput={(e) => setQty(item.slug, Number(e.currentTarget.value))}
				/>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8"
					onclick={() => remove(item.slug)}
				>
					<Trash2Icon class="h-4 w-4" />
				</Button>
			</div>
		{/each}
	</div>

	{#if available.length > 0}
		<div class="flex items-center gap-2">
			<PlusIcon class="text-muted-foreground h-4 w-4" />
			<NativeSelect
				class="flex-1"
				onchange={(e) => {
					add(e.currentTarget.value);
					e.currentTarget.value = "";
				}}
			>
				<option value="">Ajouter un objet…</option>
				{#each available as item (item.slug)}
					<option value={item.slug}>{item.name}</option>
				{/each}
			</NativeSelect>
		</div>
	{/if}
</div>
