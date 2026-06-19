/**
 * État du wizard de création de personnage (runes Svelte 5).
 *
 * Générique et data-driven : le parcours (`steps`) et le contenu proviennent de
 * l'API ; le preview live (caractéristiques finales, modificateurs, emplacements
 * de sorts) est calculé via `@mythica/character-engine`. Aucune règle D&D n'est
 * codée ici — seuls les noms de fonctions de calcul (issues du moteur) sont
 * utilisés sur des données.
 */

import {
	type AbilityScoreMethod,
	applyAbilityBonuses,
	type CasterType,
	validateAllocation,
} from "@mythica/character-engine";
import {
	abilityModifier,
	computeSpellSlots,
} from "@mythica/character-engine/dnd5e";
import {
	type BuildCharacterData,
	characterService,
	type ContentItem,
	type CreationStep,
} from "$lib/api/services/character-service";

/** Une classe sélectionnée dans le build. */
export type SelectedClass = { slug: string; level: number; isPrimary: boolean };

/** Lit le `data` JSON d'un contenu comme un objet libre. */
function contentData(item: ContentItem | undefined): Record<string, unknown> {
	return (item?.data ?? {}) as Record<string, unknown>;
}

export class CharacterBuilder {
	readonly sheetId: string;
	readonly gameSystemId: string;

	steps = $state<CreationStep[]>([]);
	/** Étape courante suivie par sa clé (robuste aux étapes conditionnelles). */
	currentStepKey = $state<string | null>(null);
	loading = $state(true);
	saving = $state(false);
	error = $state<string | null>(null);

	/** Contenu chargé par collection (lazy). */
	content = $state<Record<string, ContentItem[]>>({});

	// — Choix du joueur —
	raceSlug = $state<string | null>(null);
	classes = $state<SelectedClass[]>([]);
	backgroundSlug = $state<string | null>(null);
	abilityMethod = $state<AbilityScoreMethod>("standard_array");
	baseScores = $state<Record<string, number>>({});
	skillProficiencies = $state<string[]>([]);
	spellSlugs = $state<string[]>([]);
	inventory = $state<{ slug: string; qty: number }[]>([]);
	gold = $state<number | null>(null);
	lore = $state<Record<string, string>>({});

	constructor(sheetId: string, gameSystemId: string) {
		this.sheetId = sheetId;
		this.gameSystemId = gameSystemId;
	}

	/** Étapes visibles (les conditionnelles non remplies sont masquées). */
	visibleSteps = $derived(
		this.steps.filter((s) => !s.condition || this.conditionMet(s.condition))
	);

	/** Index dérivé de la clé courante dans les étapes visibles (0 si absente). */
	stepIndex = $derived(
		Math.max(
			0,
			this.visibleSteps.findIndex((s) => s.stepKey === this.currentStepKey)
		)
	);

	currentStep = $derived(this.visibleSteps[this.stepIndex]);

	/** Contenu de la race sélectionnée. */
	raceContent = $derived(
		(this.content.race ?? []).find((r) => r.slug === this.raceSlug)
	);

	/** Bonus de caractéristiques de la race (données). */
	raceBonuses = $derived(
		(contentData(this.raceContent).abilityBonuses ?? {}) as Record<
			string,
			number
		>
	);

	/** Scores finaux = base + bonus raciaux (helper générique du moteur). */
	finalScores = $derived(
		applyAbilityBonuses(this.baseScores, this.raceBonuses)
	);

	/** Modificateurs dérivés des scores finaux. */
	modifiers = $derived(
		Object.fromEntries(
			Object.entries(this.finalScores).map(([k, v]) => [k, abilityModifier(v)])
		) as Record<string, number>
	);

	/** Classes enrichies de leur catégorie de lanceur (depuis le contenu). */
	private casterBuilds = $derived(
		this.classes.map((c) => {
			const item = (this.content.classe ?? []).find((x) => x.slug === c.slug);
			return {
				slug: c.slug,
				level: c.level,
				casterType: (contentData(item).casterType ?? "none") as CasterType,
			};
		})
	);

	/** Au moins une classe lanceuse de sorts ? */
	hasCaster = $derived(
		this.casterBuilds.some((c) => c.casterType && c.casterType !== "none")
	);

	/** Emplacements de sorts (preview, mono ou multiclasse). */
	spellSlots = $derived(computeSpellSlots(this.casterBuilds));

	/** Niveau total du personnage. */
	totalLevel = $derived(
		this.classes.reduce((sum, c) => sum + (c.level || 0), 0)
	);

	/** Évalue un prédicat d'étape conditionnelle. */
	private conditionMet(condition: string): boolean {
		if (condition === "has_caster_class") return this.hasCaster;
		return true;
	}

	/** Charge le parcours puis le contenu des collections de sélection. */
	async init(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			const flow = await characterService.getCreationFlow(this.gameSystemId);
			this.steps = flow.steps;
			this.currentStepKey = this.visibleSteps[0]?.stepKey ?? null;

			// Pré-charge le contenu des collections référencées par les étapes.
			const collections: string[] = [];
			for (const step of this.steps) {
				const cfg = (step.config ?? {}) as { collectionKey?: string };
				if (cfg.collectionKey && !collections.includes(cfg.collectionKey)) {
					collections.push(cfg.collectionKey);
				}
			}
			await Promise.all(collections.map((c) => this.loadContent(c)));
		} catch (err) {
			this.error = err instanceof Error ? err.message : "Erreur de chargement";
		} finally {
			this.loading = false;
		}
	}

	/** Charge (et met en cache) le contenu d'une collection. */
	async loadContent(collectionKey: string): Promise<void> {
		if (this.content[collectionKey]) return;
		const res = await characterService.getContent(
			this.gameSystemId,
			collectionKey
		);
		this.content = { ...this.content, [collectionKey]: res.items };
	}

	get canGoNext(): boolean {
		const step = this.currentStep;
		if (!step) return false;
		switch (step.kind) {
			case "selection": {
				const key = (step.config as { collectionKey?: string }).collectionKey;
				if (key === "race") return this.raceSlug !== null;
				if (key === "background") return this.backgroundSlug !== null;
				if (key === "classe") return this.classes.length > 0;
				return true;
			}
			case "repeatableSelection":
				return this.classes.length > 0 && this.totalLevel > 0;
			case "pointAllocation": {
				const cfg = step.config as {
					pointBuyPool?: number;
					pointBuyCostTable?: Record<number, number>;
					minScore?: number;
					maxScore?: number;
					standardArray?: number[];
				};
				return validateAllocation(this.abilityMethod, this.baseScores, {
					pointBuy: cfg.pointBuyCostTable
						? {
								pool: cfg.pointBuyPool ?? 0,
								costTable: cfg.pointBuyCostTable,
								min: cfg.minScore ?? 0,
								max: cfg.maxScore ?? 99,
							}
						: undefined,
					standardArray: cfg.standardArray,
				}).valid;
			}
			default:
				return true;
		}
	}

	get isLastStep(): boolean {
		return this.stepIndex >= this.visibleSteps.length - 1;
	}

	next(): void {
		const next = this.visibleSteps[this.stepIndex + 1];
		if (next) this.currentStepKey = next.stepKey;
	}

	prev(): void {
		const prev = this.visibleSteps[this.stepIndex - 1];
		if (prev) this.currentStepKey = prev.stepKey;
	}

	goTo(index: number): void {
		const target = this.visibleSteps[index];
		if (target) this.currentStepKey = target.stepKey;
	}

	/** Sélectionne la classe principale (étape `selection` de classe). */
	selectPrimaryClass(slug: string): void {
		const existing = this.classes.find((c) => c.slug === slug);
		if (existing) return;
		// La première classe choisie est la classe principale (niveau 1 par défaut).
		this.classes = [{ slug, level: 1, isPrimary: this.classes.length === 0 }];
	}

	/** Construit le corps de finalisation et appelle l'API. */
	async finalize(): Promise<string | null> {
		this.saving = true;
		this.error = null;
		try {
			// N'envoie que les sorts cohérents avec les classes retenues (aucun si
			// le personnage n'a plus de classe lanceuse) — évite de persister des
			// sorts orphelins après un changement de classe.
			const classSlugs = this.classes.map((c) => c.slug);
			const spellSlugs = this.hasCaster
				? this.spellSlugs.filter((slug) => {
						const sp = (this.content.sort ?? []).find((s) => s.slug === slug);
						const classes =
							((sp?.data ?? {}) as { classes?: string[] }).classes ?? [];
						return classes.some((c) => classSlugs.includes(c));
					})
				: [];

			const body: BuildCharacterData = {
				raceSlug: this.raceSlug ?? "",
				classes: this.classes,
				backgroundSlug: this.backgroundSlug ?? "",
				abilityMethod: this.abilityMethod,
				abilityScores: this.baseScores,
				skillProficiencies: this.skillProficiencies,
				spellSlugs,
				inventory: this.inventory,
				gold: this.gold ?? undefined,
				lore: this.lore,
			};
			const res = await characterService.finalizeBuild(this.sheetId, body);
			return res?.id ?? this.sheetId;
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : "Échec de la finalisation";
			return null;
		} finally {
			this.saving = false;
		}
	}
}
