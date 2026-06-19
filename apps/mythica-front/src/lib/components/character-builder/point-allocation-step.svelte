<script lang="ts">
	import Dice5Icon from "@lucide/svelte/icons/dice-5";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import {
		type AbilityScoreMethod,
		pointBuyTotalCost,
		rollAbilityScores,
	} from "@mythica/character-engine";
	import type { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import type { CreationStep } from "$lib/api/services/character-service";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { NativeSelect } from "$lib/components/ui/native-select";

	let { builder, step }: { builder: CharacterBuilder; step: CreationStep } =
		$props();

	type Config = {
		attributes: string[];
		methods: AbilityScoreMethod[];
		standardArray?: number[];
		pointBuyPool?: number;
		pointBuyCostTable?: Record<number, number>;
		minScore?: number;
		maxScore?: number;
	};
	const config = $derived(step.config as Config);

	const LABELS: Record<string, string> = {
		force: "Force",
		dexterite: "Dextérité",
		constitution: "Constitution",
		intelligence: "Intelligence",
		sagesse: "Sagesse",
		charisme: "Charisme",
	};
	const METHOD_LABELS: Record<AbilityScoreMethod, string> = {
		standard_array: "Valeurs standard",
		point_buy: "Achat de points",
		dice_roll: "Lancer de dés",
		manual: "Saisie manuelle",
	};

	// Initialise les scores de base si absents.
	$effect(() => {
		if (Object.keys(builder.baseScores).length === 0) {
			builder.baseScores = Object.fromEntries(
				config.attributes.map((a) => [a, config.minScore ?? 8])
			);
		}
	});

	const usesSteppers = $derived(
		builder.abilityMethod === "point_buy" || builder.abilityMethod === "manual"
	);

	/** Pool de valeurs à assigner (standard array ou jet de dés). */
	let rolledPool = $state<number[] | null>(null);
	const pool = $derived(
		builder.abilityMethod === "standard_array"
			? (config.standardArray ?? [])
			: (rolledPool ?? [])
	);

	const remainingPoints = $derived.by(() => {
		if (builder.abilityMethod !== "point_buy" || !config.pointBuyCostTable)
			return null;
		try {
			return (
				(config.pointBuyPool ?? 0) -
				pointBuyTotalCost(builder.baseScores, config.pointBuyCostTable)
			);
		} catch {
			return null;
		}
	});

	function setMethod(m: AbilityScoreMethod) {
		builder.abilityMethod = m;
		rolledPool = null;
		const base = m === "manual" ? 10 : (config.minScore ?? 8);
		builder.baseScores = Object.fromEntries(
			config.attributes.map((a) => [a, base])
		);
	}

	function step1(attr: string, delta: number) {
		// En saisie manuelle, plage complète 3..20 ; en achat de points, on borne
		// avec la config (8..15 par défaut).
		const manual = builder.abilityMethod === "manual";
		const min = manual ? 3 : (config.minScore ?? 8);
		const max = manual ? 20 : (config.maxScore ?? 15);
		const next = (builder.baseScores[attr] ?? min) + delta;
		if (next < min || next > max) return;
		builder.baseScores = { ...builder.baseScores, [attr]: next };
	}

	function roll() {
		rolledPool = rollAbilityScores(config.attributes.length);
		builder.baseScores = Object.fromEntries(
			config.attributes.map((a) => [a, 0])
		);
	}

	/** Valeurs du pool encore disponibles (assignation unique). */
	const assigned = $derived(Object.values(builder.baseScores));
	function availableFor(attr: string): number[] {
		const used = [...assigned];
		const current = builder.baseScores[attr] ?? 0;
		// retire une occurrence de la valeur courante pour qu'elle reste choisissable
		const idx = used.indexOf(current);
		if (idx >= 0) used.splice(idx, 1);
		const remaining = [...pool];
		for (const u of used) {
			const i = remaining.indexOf(u);
			if (i >= 0) remaining.splice(i, 1);
		}
		return remaining;
	}

	function assign(attr: string, value: number) {
		builder.baseScores = { ...builder.baseScores, [attr]: value };
	}

	/** Options du select : valeurs disponibles + la valeur courante éventuelle. */
	function optionsFor(attr: string): number[] {
		const opts = [...availableFor(attr)];
		const current = builder.baseScores[attr] ?? 0;
		if (current > 0 && !opts.includes(current)) opts.push(current);
		return opts;
	}

	const fmtMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`);
</script>

<div class="space-y-6">
	<!-- Choix de la méthode -->
	<div class="flex flex-wrap gap-2">
		{#each config.methods as method (method)}
			<Button
				variant={builder.abilityMethod === method ? "default" : "outline"}
				size="sm"
				onclick={() => setMethod(method)}
			>
				{METHOD_LABELS[method]}
			</Button>
		{/each}
	</div>

	<div class="flex flex-wrap items-center gap-4 text-sm">
		{#if remainingPoints !== null}
			<span class="text-muted-foreground">
				Points restants :
				<span
					class="font-display text-base font-semibold {remainingPoints < 0
						? 'text-destructive'
						: 'text-primary'}">{remainingPoints}</span
				>
			</span>
		{/if}
		{#if builder.abilityMethod === "dice_roll"}
			<Button variant="secondary" size="sm" onclick={roll}>
				<Dice5Icon class="h-4 w-4" /> Lancer les dés (4d6)
			</Button>
		{/if}
		{#if builder.abilityMethod === "standard_array" && config.standardArray}
			<span class="text-muted-foreground">
				À répartir : {config.standardArray.join(", ")}
			</span>
		{/if}
	</div>

	<!-- Grille des caractéristiques -->
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each config.attributes as attr (attr)}
			{@const final = builder.finalScores[attr] ?? 0}
			{@const mod = builder.modifiers[attr] ?? 0}
			{@const bonus = builder.raceBonuses[attr] ?? 0}
			<Card.Root class="gap-0 py-4">
				<Card.Content class="px-4">
					<div class="flex items-center justify-between">
						<span class="font-display text-sm font-semibold"
							>{LABELS[attr] ?? attr}</span
						>
						<span class="text-muted-foreground text-xs">
							mod <span class="text-foreground font-medium">{fmtMod(mod)}</span>
						</span>
					</div>

					<div class="mt-3 flex items-center gap-2">
						{#if usesSteppers}
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={() => step1(attr, -1)}
							>
								<MinusIcon class="h-4 w-4" />
							</Button>
							<span class="font-display w-10 text-center text-xl font-bold">
								{builder.baseScores[attr] ?? 0}
							</span>
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={() => step1(attr, 1)}
							>
								<PlusIcon class="h-4 w-4" />
							</Button>
						{:else}
							<NativeSelect
								class="w-20"
								value={builder.baseScores[attr] ?? 0}
								onchange={(e) => assign(attr, Number(e.currentTarget.value))}
							>
								<option value={0}>—</option>
								{#each optionsFor(attr) as v, i (i)}
									<option value={v}>{v}</option>
								{/each}
							</NativeSelect>
						{/if}

						<div class="ml-auto text-right">
							<div class="font-display text-lg font-bold text-primary">
								{final}
							</div>
							{#if bonus}
								<div class="text-muted-foreground text-[11px]">
									base +{bonus} race
								</div>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
