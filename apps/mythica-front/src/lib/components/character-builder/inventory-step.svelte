<script lang="ts">
	import CoinsIcon from "@lucide/svelte/icons/coins";
	import DicesIcon from "@lucide/svelte/icons/dices";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { NativeSelect } from "$lib/components/ui/native-select";

	let { builder }: { builder: CharacterBuilder } = $props();

	const groups = $derived(builder.startingEquipmentGroups);
	const roll = $derived(builder.startingGoldRoll);

	/** Initialise un choix par groupe (première option par défaut). */
	$effect(() => {
		if (builder.equipmentChoices.length !== groups.length) {
			builder.equipmentChoices = groups.map(
				(_, i) => builder.equipmentChoices[i] ?? 0
			);
		}
	});

	const fmt = (g: number) =>
		Number.isInteger(g) ? `${g}` : g.toFixed(1).replace(/\.0$/, "");

	const describe = (items: { slug: string; qty: number }[]) =>
		items
			.map((it) =>
				it.qty > 1
					? `${it.qty}× ${builder.itemName(it.slug)}`
					: builder.itemName(it.slug)
			)
			.join(", ");

	function choose(groupIndex: number, optionIndex: number) {
		builder.equipmentChoices = builder.equipmentChoices.map((v, i) =>
			i === groupIndex ? optionIndex : v
		);
	}

	function toggleSell(slug: string) {
		builder.soldBaseSlugs = builder.soldBaseSlugs.includes(slug)
			? builder.soldBaseSlugs.filter((s) => s !== slug)
			: [...builder.soldBaseSlugs, slug];
	}

	const purchasable = $derived(
		(builder.content.equipement ?? [])
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	function buy(slug: string) {
		if (!slug) return;
		if (builder.itemCost(slug) > builder.availableGold) return;
		const existing = builder.purchases.find((p) => p.slug === slug);
		builder.purchases = existing
			? builder.purchases.map((p) =>
					p.slug === slug ? { ...p, qty: p.qty + 1 } : p
				)
			: [...builder.purchases, { slug, qty: 1 }];
	}
	function setPurchaseQty(slug: string, qty: number) {
		if (qty < 1) return;
		builder.purchases = builder.purchases.map((p) =>
			p.slug === slug ? { ...p, qty } : p
		);
	}
	function removePurchase(slug: string) {
		builder.purchases = builder.purchases.filter((p) => p.slug !== slug);
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<!-- Équipement de départ de la classe -->
	{#if groups.length > 0}
		<section class="space-y-3">
			<h2 class="font-display text-lg font-semibold">Équipement de classe</h2>
			{#each groups as group, i (i)}
				{#if group.options.length === 1}
					<div class="bg-muted/40 rounded-lg border p-3 text-sm">
						<span class="text-muted-foreground text-xs uppercase tracking-wide">
							Fourni
						</span>
						<p>{describe(group.options[0].items)}</p>
					</div>
				{:else}
					<div class="grid gap-2 sm:grid-cols-2">
						{#each group.options as option, j (j)}
							{@const active = (builder.equipmentChoices[i] ?? 0) === j}
							<button
								type="button"
								onclick={() => choose(i, j)}
								aria-pressed={active}
								class="rounded-lg border p-3 text-left text-sm transition-colors
									{active
									? 'border-primary bg-primary/5 ring-primary ring-1'
									: 'hover:border-primary/40 hover:bg-muted/40'}"
							>
								<span class="font-medium">{option.label}</span>
								<span class="text-muted-foreground block text-xs">
									{describe(option.items)}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			{/each}
		</section>
	{/if}

	<!-- Bourse de départ (lancer unique) -->
	<section>
		<Card.Root>
			<Card.Content class="flex items-center gap-3 py-4">
				<CoinsIcon class="text-primary h-5 w-5 shrink-0" />
				{#if !builder.goldRollDone}
					<div class="flex-1">
						<p class="font-medium">Bourse de départ</p>
						{#if roll}
							<p class="text-muted-foreground text-xs">
								{roll.dice}d{roll.sides}{roll.mult > 1 ? ` × ${roll.mult}` : ""} po
								(classe principale){builder.backgroundGold
									? `, + ${builder.backgroundGold} po d'historique`
									: ""}
							</p>
						{/if}
					</div>
					<Button onclick={() => builder.rollStartingGold()} disabled={!roll}>
						<DicesIcon class="mr-2 h-4 w-4" /> Lancer
					</Button>
				{:else}
					<div class="flex-1">
						<p class="font-medium">Bourse : {fmt(builder.availableGold)} po</p>
						<p class="text-muted-foreground text-xs">
							Lancer : {fmt(builder.goldRolled ?? 0)} po{builder.backgroundGold
								? ` + ${builder.backgroundGold} po (historique)`
								: ""} · achats −{fmt(builder.purchaseCost)} · reventes +{fmt(
								builder.sellRefund
							)}
						</p>
					</div>
					<Badge
						variant={builder.availableGold < 0 ? "destructive" : "secondary"}
					>
						{fmt(builder.availableGold)} po
					</Badge>
				{/if}
			</Card.Content>
		</Card.Root>
	</section>

	{#if builder.goldRollDone}
		<!-- Revente de l'équipement de base -->
		{#if builder.baseEquipmentAll.length > 0}
			<section class="space-y-2">
				<h2 class="font-display text-lg font-semibold">Équipement de base</h2>
				<p class="text-muted-foreground text-sm">
					Revendez un objet pour récupérer 50 % de sa valeur (au détriment de
					votre équipement).
				</p>
				{#each builder.baseEquipmentAll as item (item.slug)}
					{@const sold = builder.soldBaseSlugs.includes(item.slug)}
					<div
						class="flex items-center gap-3 rounded-lg border p-3 text-sm {sold
							? 'opacity-50'
							: ''}"
					>
						<span class="flex-1 font-medium">
							{item.qty > 1 ? `${item.qty}× ` : ""}{builder.itemName(item.slug)}
						</span>
						<span class="text-muted-foreground text-xs">
							{fmt((builder.itemCost(item.slug) * item.qty) / 2)} po
						</span>
						<Button
							variant={sold ? "secondary" : "outline"}
							size="sm"
							onclick={() => toggleSell(item.slug)}
						>
							{sold ? "Annuler" : "Vendre"}
						</Button>
					</div>
				{/each}
			</section>
		{/if}

		<!-- Achat d'équipement -->
		<section class="space-y-2">
			<h2 class="font-display text-lg font-semibold">
				Acheter de l'équipement
			</h2>
			<div class="flex items-center gap-2">
				<PlusIcon class="text-muted-foreground h-4 w-4" />
				<NativeSelect
					class="flex-1"
					onchange={(e) => {
						buy(e.currentTarget.value);
						e.currentTarget.value = "";
					}}
				>
					<option value="">Ajouter un objet…</option>
					{#each purchasable as item (item.slug)}
						<option
							value={item.slug}
							disabled={builder.itemCost(item.slug) > builder.availableGold}
						>
							{item.name} — {fmt(builder.itemCost(item.slug))} po
						</option>
					{/each}
				</NativeSelect>
			</div>
			{#each builder.purchases as item (item.slug)}
				<div class="flex items-center gap-3 rounded-lg border p-3 text-sm">
					<span class="flex-1 font-medium">{builder.itemName(item.slug)}</span>
					<span class="text-muted-foreground text-xs">
						{fmt(builder.itemCost(item.slug))} po/u
					</span>
					<Input
						type="number"
						min="1"
						class="w-16"
						value={item.qty}
						oninput={(e) =>
							setPurchaseQty(item.slug, Number(e.currentTarget.value))}
					/>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={() => removePurchase(item.slug)}
					>
						<Trash2Icon class="h-4 w-4" />
					</Button>
				</div>
			{/each}
		</section>
	{/if}
</div>
