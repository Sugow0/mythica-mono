<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { CharacterBuilder } from "$lib/character-builder/builder.svelte";
	import InventoryStep from "$lib/components/character-builder/inventory-step.svelte";
	import LoreFormStep from "$lib/components/character-builder/lore-form-step.svelte";
	import PointAllocationStep from "$lib/components/character-builder/point-allocation-step.svelte";
	import ProficiencyChoiceStep from "$lib/components/character-builder/proficiency-choice-step.svelte";
	import RepeatableSelectionStep from "$lib/components/character-builder/repeatable-selection-step.svelte";
	import SelectionStep from "$lib/components/character-builder/selection-step.svelte";
	import SpellSelectionStep from "$lib/components/character-builder/spell-selection-step.svelte";
	import WizardStepper from "$lib/components/character-builder/wizard-stepper.svelte";
	import { Button } from "$lib/components/ui/button";
	import { characterService } from "$lib/index.js";

	const sheetId = $derived(page.params.id ?? "");

	let builder = $state<CharacterBuilder | null>(null);
	let bootError = $state<string | null>(null);

	const STEP_TITLES: Record<string, string> = {
		race: "Choisissez votre race",
		classe: "Choisissez votre classe",
		niveau: "Niveau et multiclassage",
		background: "Choisissez votre historique",
		caracteristiques: "Répartissez vos caractéristiques",
		maitrises: "Choisissez vos maîtrises",
		sorts: "Sélectionnez vos sorts",
		inventaire: "Équipement et or",
		identite: "Identité du personnage",
		lore: "L'histoire de votre personnage",
	};

	onMount(async () => {
		try {
			const sheet = await characterService.getCharacterSheetById(sheetId);
			const b = new CharacterBuilder(sheetId, sheet.gameSystemId);
			await b.init();
			builder = b;
		} catch (err) {
			bootError = err instanceof Error ? err.message : "Erreur de chargement";
		}
	});

	async function finish() {
		if (!builder) return;
		const id = await builder.finalize();
		if (id) await goto(`/characters/${id}`);
	}
</script>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
	<Button variant="ghost" href="/characters" class="mb-4">
		<ArrowLeftIcon class="h-4 w-4" /> Mes personnages
	</Button>

	{#if bootError}
		<div
			class="text-destructive flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
			role="alert"
		>
			<TriangleAlertIcon class="h-5 w-5" />
			{bootError}
		</div>
	{:else if !builder || builder.loading}
		<div
			class="text-muted-foreground flex items-center gap-2 py-20 justify-center"
		>
			<LoaderIcon class="h-5 w-5 animate-spin" /> Chargement du parcours de création…
		</div>
	{:else if builder.currentStep}
		{@const step = builder.currentStep}
		<header class="mb-5">
			<p class="text-primary text-xs font-semibold uppercase tracking-[0.18em]">
				Étape {builder.stepIndex + 1} / {builder.visibleSteps.length}
			</p>
			<h1 class="font-display mt-1 text-3xl font-bold">
				{STEP_TITLES[step.stepKey] ?? step.stepKey}
			</h1>
		</header>

		<WizardStepper {builder} />

		<div class="my-6">
			{#if step.kind === "selection"}
				<SelectionStep {builder} {step} />
			{:else if step.kind === "repeatableSelection"}
				<RepeatableSelectionStep {builder} {step} />
			{:else if step.kind === "pointAllocation"}
				<PointAllocationStep {builder} {step} />
			{:else if step.kind === "proficiencyChoice"}
				<ProficiencyChoiceStep {builder} />
			{:else if step.kind === "spellSelection"}
				<SpellSelectionStep {builder} />
			{:else if step.kind === "inventory"}
				<InventoryStep {builder} {step} />
			{:else if step.kind === "loreForm"}
				<LoreFormStep {builder} {step} />
			{/if}
		</div>

		{#if builder.error}
			<p class="text-destructive mb-3 text-sm" role="alert">{builder.error}</p>
		{/if}

		<footer
			class="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur"
		>
			<Button
				variant="outline"
				onclick={() => builder?.prev()}
				disabled={builder.stepIndex === 0}
			>
				<ArrowLeftIcon class="h-4 w-4" /> Précédent
			</Button>

			{#if builder.isLastStep}
				<Button onclick={finish} disabled={builder.saving}>
					{#if builder.saving}
						<LoaderIcon class="h-4 w-4 animate-spin" />
					{:else}
						<SparklesIcon class="h-4 w-4" />
					{/if}
					Créer le personnage
				</Button>
			{:else}
				<Button onclick={() => builder?.next()} disabled={!builder.canGoNext}>
					Suivant <ArrowRightIcon class="h-4 w-4" />
				</Button>
			{/if}
		</footer>
	{/if}
</div>
