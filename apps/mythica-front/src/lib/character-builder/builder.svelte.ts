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
	type HitPointsMethod,
	rollStartingWealth,
	validateAllocation,
} from "@mythica/character-engine";
import {
	abilityImprovementSlots,
	abilityModifier,
	computeHitPoints,
	computeSpellSlots,
	expertiseSlots,
	maxSpellSlotLevel,
	pactMagic,
	preparedSpellsForKind,
	rolledHitDiceCount,
	rollHitPointDice,
	singleClassSlots,
	wizardSpellbookSize,
} from "@mythica/character-engine/dnd5e";
import {
	type BuildCharacterData,
	type CharacterSheetDetail,
	characterService,
	type ContentItem,
	type CreationStep,
} from "$lib/api/services/character-service";

/** Une classe sélectionnée dans le build. */
export type SelectedClass = { slug: string; level: number; isPrimary: boolean };

/** Paliers d'ASI par défaut (PHB) si la classe n'en déclare pas. */
const DEFAULT_ASI_LEVELS = [4, 8, 12, 16, 19];

/** Un choix de palier d'ASI : amélioration de caractéristiques ou don. */
export type Improvement =
	| { type: "asi"; abilities: Record<string, number> }
	| { type: "feat"; slug: string };

/** Rôle d'un sort sélectionné. */
export type SpellRole = "cantrip" | "spell" | "book";

/** Un objet d'équipement avec sa quantité. */
export type EquipmentEntry = { slug: string; qty: number };

/** Mécanique de sélection de sorts d'une classe (depuis le contenu). */
type SpellcastingMeta = {
	kind:
		| "prepared"
		| "prepared_half"
		| "known"
		| "known_half"
		| "wizard"
		| "pact"
		| "third_known";
	ability: string;
	cantripsKnown?: number[];
	spellsKnown?: number[];
	spellListClass?: string;
	schoolFilter?: string[];
};

/** Infos de sélection de sorts calculées pour une classe lanceuse. */
export type SpellcastingClassInfo = {
	slug: string;
	name: string;
	kind: SpellcastingMeta["kind"];
	ability: string;
	abilityMod: number;
	maxSpellLevel: number;
	cantripsLimit: number;
	spellsLimit: number;
	spellbookLimit: number;
	/** Libellé du pool principal (« connus » / « préparés »). */
	spellsLabel: string;
	/** Liste de sorts à présenter (slug de classe) — diffère pour les tiers-lanceurs. */
	spellListClass: string;
	/** Restriction d'écoles (tiers-lanceur). */
	schoolFilter?: string[];
};

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
	/** Méthode de détermination des PV (moyenne fixe par défaut). */
	hpMethod = $state<HitPointsMethod>("average");
	/** Valeurs des dés de vie lancées (méthode `roll`), hors tout premier niveau. */
	hpRolls = $state<number[]>([]);
	skillProficiencies = $state<string[]>([]);
	/** Compétences choisies en expertise (double maîtrise). */
	expertises = $state<string[]>([]);
	/** Améliorations de caractéristiques / dons choisis (un par palier d'ASI). */
	improvements = $state<Improvement[]>([]);
	/** Sélection de sorts par classe : cantrips, sorts (connus/préparés), grimoire. */
	spellSelections = $state<
		Record<
			string,
			{ cantrips: string[]; spells: string[]; spellbook: string[] }
		>
	>({});
	lore = $state<Record<string, string>>({});
	/** Sous-classe choisie par classe : slug de classe → slug de sous-classe. */
	subclassSelections = $state<Record<string, string>>({});

	// — Équipement & bourse de départ —
	/** Option choisie par groupe de choix d'équipement de la classe principale. */
	equipmentChoices = $state<number[]>([]);
	/** Objets de base revendus (par slug) contre 50 % de leur valeur. */
	soldBaseSlugs = $state<string[]>([]);
	/** Objets achetés avec la bourse. */
	purchases = $state<{ slug: string; qty: number }[]>([]);
	/** Bourse obtenue par l'unique lancer de richesse (null tant que non lancée). */
	goldRolled = $state<number | null>(null);
	/** Classe pour laquelle la bourse a été lancée (réinitialise si elle change). */
	rolledClassSlug = $state<string | null>(null);

	// — Ré-édition d'un build existant —
	/** Inventaire déjà enregistré (conservé tant que la bourse n'est pas relancée). */
	existingInventory = $state<EquipmentEntry[]>([]);
	/** Or déjà enregistré (conservé tant que la bourse n'est pas relancée). */
	existingGold = $state<number | null>(null);

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

	/** Contenu de la classe principale. */
	primaryClassContent = $derived(
		(this.content.classe ?? []).find(
			(c) =>
				c.slug ===
				(this.classes.find((x) => x.isPrimary) ?? this.classes[0])?.slug
		)
	);

	/** Contenu de l'historique sélectionné. */
	backgroundContent = $derived(
		(this.content.background ?? []).find((b) => b.slug === this.backgroundSlug)
	);

	/** Groupes de choix d'équipement de la classe principale. */
	startingEquipmentGroups = $derived(
		(contentData(this.primaryClassContent).startingEquipmentOptions ?? []) as {
			options: { label: string; items: EquipmentEntry[] }[];
		}[]
	);

	/** Dés de richesse de départ de la classe principale. */
	startingGoldRoll = $derived(
		contentData(this.primaryClassContent).startingGoldRoll as
			| { dice: number; sides: number; mult: number }
			| undefined
	);

	/** Or fixe accordé par l'historique. */
	backgroundGold = $derived(
		Number(contentData(this.backgroundContent).startingGold ?? 0)
	);

	/** Coût (en po) d'un objet d'équipement. */
	itemCost(slug: string): number {
		const item = (this.content.equipement ?? []).find((i) => i.slug === slug);
		return Number((contentData(item).costGp as number) ?? 0);
	}

	/** Nom d'un objet d'équipement. */
	itemName(slug: string): string {
		return (
			(this.content.equipement ?? []).find((i) => i.slug === slug)?.name ?? slug
		);
	}

	/** Équipement de base accordé (options choisies fusionnées par slug). */
	baseEquipmentAll = $derived.by<EquipmentEntry[]>(() => {
		const merged: Record<string, number> = {};
		this.startingEquipmentGroups.forEach((group, i) => {
			const opt =
				group.options[this.equipmentChoices[i] ?? 0] ?? group.options[0];
			for (const it of opt?.items ?? [])
				merged[it.slug] = (merged[it.slug] ?? 0) + it.qty;
		});
		return Object.entries(merged).map(([slug, qty]) => ({ slug, qty }));
	});

	/** Équipement de base conservé (hors objets revendus). */
	baseEquipment = $derived(
		this.baseEquipmentAll.filter((e) => !this.soldBaseSlugs.includes(e.slug))
	);

	/** Coût total des achats. */
	purchaseCost = $derived(
		this.purchases.reduce((s, p) => s + this.itemCost(p.slug) * p.qty, 0)
	);

	/** Remboursement des reventes (50 % de la valeur). */
	sellRefund = $derived(
		this.baseEquipmentAll
			.filter((e) => this.soldBaseSlugs.includes(e.slug))
			.reduce((s, e) => s + (this.itemCost(e.slug) * e.qty) / 2, 0)
	);

	/** Bourse disponible = lancer + or d'historique − achats + reventes. */
	availableGold = $derived(
		(this.goldRolled ?? 0) +
			this.backgroundGold -
			this.purchaseCost +
			this.sellRefund
	);

	/** Inventaire final = équipement de base conservé + achats (fusionné). */
	finalInventory = $derived.by<EquipmentEntry[]>(() => {
		const merged: Record<string, number> = {};
		for (const e of [...this.baseEquipment, ...this.purchases])
			merged[e.slug] = (merged[e.slug] ?? 0) + e.qty;
		return Object.entries(merged).map(([slug, qty]) => ({ slug, qty }));
	});

	/** La bourse a-t-elle été lancée pour la classe principale courante ? */
	goldRollDone = $derived(
		this.goldRolled !== null &&
			this.rolledClassSlug === this.primaryClassContent?.slug
	);

	/** Un inventaire/or a-t-il déjà été enregistré (ré-édition) ? */
	hasExistingInventory = $derived(
		this.existingInventory.length > 0 || this.existingGold !== null
	);

	/**
	 * En ré-édition, on conserve l'inventaire et l'or existants tant que la bourse
	 * n'a pas été relancée (un nouveau lancer repart de zéro).
	 */
	keepExistingInventory = $derived(
		this.goldRolled === null && this.hasExistingInventory
	);

	/** Lance l'unique jet de richesse de départ (verrouillé ensuite). */
	rollStartingGold(): void {
		const spec = this.startingGoldRoll;
		if (!spec || this.goldRollDone) return;
		this.goldRolled = rollStartingWealth(spec);
		this.rolledClassSlug = this.primaryClassContent?.slug ?? null;
	}

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

	/** Bonus issus des améliorations (ASI) et des demi-dons choisis. */
	improvementBonuses = $derived.by<Record<string, number>>(() => {
		const bonuses: Record<string, number> = {};
		const add = (k: string, v: number) => {
			bonuses[k] = (bonuses[k] ?? 0) + v;
		};
		for (const imp of this.improvements) {
			if (imp.type === "asi") {
				for (const [k, v] of Object.entries(imp.abilities)) add(k, v);
			} else {
				const item = (this.content.don ?? []).find((d) => d.slug === imp.slug);
				const ab = (contentData(item).abilityBonuses ?? {}) as Record<
					string,
					number
				>;
				for (const [k, v] of Object.entries(ab)) add(k, v);
			}
		}
		return bonuses;
	});

	/** Scores effectifs = finaux + améliorations/dons, plafonnés à 20. */
	effectiveScores = $derived.by<Record<string, number>>(() => {
		const scores = { ...this.finalScores };
		for (const [k, v] of Object.entries(this.improvementBonuses)) {
			scores[k] = Math.min(20, (scores[k] ?? 0) + v);
		}
		return scores;
	});

	/** Modificateurs dérivés des scores effectifs (après améliorations/dons). */
	modifiers = $derived(
		Object.fromEntries(
			Object.entries(this.effectiveScores).map(([k, v]) => [
				k,
				abilityModifier(v),
			])
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

	/** Classes enrichies de leur dé de vie (depuis le contenu). */
	private hitDieBuilds = $derived(
		this.classes.map((c) => {
			const item = (this.content.classe ?? []).find((x) => x.slug === c.slug);
			return {
				hitDie: Number(contentData(item).hitDie) || 8,
				level: c.level,
				isPrimary: c.isPrimary,
			};
		})
	);

	/** Modificateur de Constitution (PV). */
	conModifier = $derived(this.modifiers.constitution ?? 0);

	/** Nombre de dés à lancer (tous les niveaux sauf le tout premier). */
	hpRollsNeeded = $derived(rolledHitDiceCount(this.hitDieBuilds));

	/** PV (preview) selon la méthode choisie ; détail par niveau pour l'UI. */
	hitPoints = $derived(
		computeHitPoints({
			classes: this.hitDieBuilds,
			conMod: this.conModifier,
			method: this.hpMethod,
			rolls: this.hpRolls,
		})
	);

	/** PV maximum calculés. */
	maxHp = $derived(this.hitPoints.maxHp);

	/** Les dés de vie ont-ils été lancés pour la composition actuelle ? */
	hpRollsDone = $derived(this.hpRolls.length >= this.hpRollsNeeded);

	/** Lance tous les dés de vie (méthode `roll`), classe principale d'abord. */
	rollHitPoints(): void {
		this.hpRolls = rollHitPointDice(this.hitDieBuilds);
	}

	/** Infos de sélection de sorts par classe lanceuse (limites, niveau max). */
	spellcastingClasses = $derived.by<SpellcastingClassInfo[]>(() => {
		const out: SpellcastingClassInfo[] = [];
		const subs = this.content["sous-classe"] ?? [];
		for (const c of this.classes) {
			const item = (this.content.classe ?? []).find((x) => x.slug === c.slug);
			// Spellcasting de la classe, sinon de la sous-classe choisie (tiers-lanceur).
			let sc = contentData(item).spellcasting as SpellcastingMeta | undefined;
			if (!sc) {
				const sub = subs.find(
					(s) => s.slug === this.subclassSelections[c.slug]
				);
				sc = sub
					? (contentData(sub).spellcasting as SpellcastingMeta)
					: undefined;
			}
			if (!sc) continue;
			const level = c.level;
			const idx = Math.min(Math.max(level, 1), 20) - 1;
			const abilityMod = this.modifiers[sc.ability] ?? 0;
			const casterType: CasterType =
				sc.kind === "third_known"
					? "third"
					: ((contentData(item).casterType ?? "none") as CasterType);
			const maxSpellLevel =
				sc.kind === "pact"
					? pactMagic(level).slotLevel
					: maxSpellSlotLevel(singleClassSlots(casterType, level));
			const prepared = preparedSpellsForKind(sc.kind, abilityMod, level);
			const spellsLimit = prepared ?? sc.spellsKnown?.[idx] ?? 0;
			out.push({
				slug: c.slug,
				name: item?.name ?? c.slug,
				kind: sc.kind,
				ability: sc.ability,
				abilityMod,
				maxSpellLevel,
				cantripsLimit: sc.cantripsKnown?.[idx] ?? 0,
				spellsLimit,
				spellbookLimit: sc.kind === "wizard" ? wizardSpellbookSize(level) : 0,
				spellsLabel: prepared !== null ? "Sorts préparés" : "Sorts connus",
				spellListClass: sc.spellListClass ?? c.slug,
				schoolFilter: sc.schoolFilter,
			});
		}
		return out;
	});

	/** Y a-t-il au moins un sort/cantrip à choisir au niveau actuel ? */
	hasSpellsToChoose = $derived(
		this.spellcastingClasses.some(
			(i) => i.cantripsLimit > 0 || i.maxSpellLevel > 0
		)
	);

	/** Sous-classes choisissables par classe (selon le niveau d'obtention). */
	subclassChoices = $derived.by(() => {
		const all = this.content["sous-classe"] ?? [];
		return this.classes
			.map((c) => {
				const item = (this.content.classe ?? []).find((x) => x.slug === c.slug);
				const subclasses = all.filter((s) => {
					const d = contentData(s) as {
						parentClass?: string;
						acquisitionLevel?: number;
					};
					return (
						d.parentClass === c.slug && (d.acquisitionLevel ?? 99) <= c.level
					);
				});
				return {
					classSlug: c.slug,
					className: item?.name ?? c.slug,
					subclasses,
				};
			})
			.filter((x) => x.subclasses.length > 0);
	});

	/** Au moins une sous-classe à choisir au niveau actuel ? */
	hasSubclassChoice = $derived(this.subclassChoices.length > 0);

	/** Sous-classes effectivement choisies (slugs). */
	private chosenSubclasses = $derived(
		Object.values(this.subclassSelections).filter(Boolean)
	);

	/** Nombre total d'expertises à choisir (classes + sous-classes). */
	expertiseCount = $derived.by(() => {
		let n = 0;
		for (const c of this.classes) {
			const item = (this.content.classe ?? []).find((x) => x.slug === c.slug);
			n += expertiseSlots(
				contentData(item).expertise as
					| { level: number; count: number }[]
					| undefined,
				c.level
			);
		}
		for (const slug of this.chosenSubclasses) {
			const item = (this.content["sous-classe"] ?? []).find(
				(x) => x.slug === slug
			);
			const exp = contentData(item).expertise as
				| { count: number; from: string[] }
				| undefined;
			n += exp?.count ?? 0;
		}
		return n;
	});

	/** Compétences éligibles à l'expertise (maîtrisées + listes de sous-classe). */
	expertiseOptions = $derived.by<string[]>(() => {
		const opts: string[] = [...this.skillProficiencies];
		opts.push(
			...((contentData(this.raceContent).skillProficiencies ?? []) as string[]),
			...((contentData(this.backgroundContent).skillProficiencies ??
				[]) as string[])
		);
		for (const slug of this.chosenSubclasses) {
			const item = (this.content["sous-classe"] ?? []).find(
				(x) => x.slug === slug
			);
			opts.push(
				...((contentData(item).skillProficiencies ?? []) as string[]),
				...(((contentData(item).expertise as { from?: string[] } | undefined)
					?.from ?? []) as string[])
			);
		}
		return opts.filter((s, i) => opts.indexOf(s) === i);
	});

	/** A-t-on des expertises à choisir ? */
	hasExpertise = $derived(this.expertiseCount > 0);

	/** Nombre d'emplacements d'amélioration/don (paliers d'ASI, par classe). */
	improvementSlots = $derived.by(() => {
		let n = 0;
		for (const c of this.classes) {
			const item = (this.content.classe ?? []).find((x) => x.slug === c.slug);
			const asiLevels =
				(contentData(item).asiLevels as number[] | undefined) ??
				DEFAULT_ASI_LEVELS;
			n += abilityImprovementSlots(asiLevels, c.level);
		}
		return n;
	});

	/** Y a-t-il au moins un palier d'amélioration/don ? */
	hasAbilityImprovement = $derived(this.improvementSlots > 0);

	/** Tous les emplacements sont-ils renseignés validement ? */
	improvementsComplete = $derived.by(() => {
		if (this.improvements.length !== this.improvementSlots) return false;
		return this.improvements.every((imp) => {
			if (imp.type === "feat") return Boolean(imp.slug);
			const total = Object.values(imp.abilities).reduce((s, v) => s + v, 0);
			return total === 2;
		});
	});

	/** Évalue un prédicat d'étape conditionnelle. */
	private conditionMet(condition: string): boolean {
		if (condition === "has_caster_class") return this.hasSpellsToChoose;
		if (condition === "has_subclass_choice") return this.hasSubclassChoice;
		if (condition === "has_ability_improvement")
			return this.hasAbilityImprovement;
		return true;
	}

	/**
	 * Hydrate l'état du wizard depuis une fiche déjà construite, pour ré-éditer
	 * les choix du build. À appeler après `init()` (le contenu doit être chargé).
	 *
	 * Reconstitue les choix réversibles (race, classes, sous-classes, sorts,
	 * caractéristiques de base, maîtrises, lore) ; l'inventaire et l'or sont
	 * conservés tels quels tant que la bourse n'est pas relancée.
	 */
	loadExisting(detail: CharacterSheetDetail): void {
		const sel = detail.selections ?? [];
		const ofKey = (key: string) => sel.filter((s) => s.collectionKey === key);

		this.raceSlug = ofKey("race")[0]?.slug ?? null;
		this.backgroundSlug = ofKey("background")[0]?.slug ?? null;

		const classes = ofKey("classe").map((s) => ({
			slug: s.slug,
			level: Number(s.level ?? 1),
			isPrimary: s.isPrimary ?? false,
		}));
		if (classes.length > 0 && !classes.some((c) => c.isPrimary)) {
			classes[0].isPrimary = true;
		}
		this.classes = classes;

		const subs: Record<string, string> = {};
		for (const s of ofKey("sous-classe")) {
			const cs = (s.extra as { classSlug?: string } | null)?.classSlug;
			if (cs) subs[cs] = s.slug;
		}
		this.subclassSelections = subs;

		const spells: Record<
			string,
			{ cantrips: string[]; spells: string[]; spellbook: string[] }
		> = {};
		for (const s of ofKey("sort")) {
			const extra = (s.extra ?? {}) as { classSlug?: string; role?: SpellRole };
			const cs = extra.classSlug;
			if (!cs) continue;
			const bucket = (spells[cs] ??= {
				cantrips: [],
				spells: [],
				spellbook: [],
			});
			if (extra.role === "cantrip") bucket.cantrips.push(s.slug);
			else if (extra.role === "book") bucket.spellbook.push(s.slug);
			else bucket.spells.push(s.slug);
		}
		this.spellSelections = spells;

		if (detail.abilityMethod) {
			this.abilityMethod = detail.abilityMethod as AbilityScoreMethod;
		}

		// Valeurs projetées sur la fiche (caracs finales, maîtrises, lore…).
		const valueByKey: Record<string, unknown> = {};
		for (const p of detail.properties) valueByKey[p.key] = p.value;

		// Améliorations (ASI) + dons choisis, restaurés pour la ré-édition.
		const asiImprovements: Improvement[] = Array.isArray(
			valueByKey.ameliorations
		)
			? (valueByKey.ameliorations as Record<string, number>[]).map((a) => ({
					type: "asi",
					abilities: a,
				}))
			: [];
		const featImprovements: Improvement[] = ofKey("don").map((s) => ({
			type: "feat",
			slug: s.slug,
		}));
		this.improvements = [...asiImprovements, ...featImprovements];

		// Scores de base = scores finaux − bonus raciaux − améliorations/dons
		// (inverse de la projection du build).
		const allocStep = this.steps.find((s) => s.kind === "pointAllocation");
		const attrs =
			(allocStep?.config as { attributes?: string[] } | undefined)
				?.attributes ?? [];
		const bonuses = this.raceBonuses;
		const improvements = this.improvementBonuses;
		const base: Record<string, number> = {};
		for (const a of attrs) {
			const final = Number(valueByKey[a]);
			if (Number.isFinite(final) && final > 0) {
				base[a] = final - (bonuses[a] ?? 0) - (improvements[a] ?? 0);
			}
		}
		if (Object.keys(base).length > 0) this.baseScores = base;

		// Maîtrises choisies = maîtrises vraies de la classe, hors maîtrises
		// déjà accordées par la race ou l'historique.
		const granted = [
			...((contentData(this.raceContent).skillProficiencies ?? []) as string[]),
			...((contentData(this.backgroundContent).skillProficiencies ??
				[]) as string[]),
		];
		const classChoices = (contentData(this.primaryClassContent).skillChoices ??
			{}) as { from?: string[] };
		const fromList = classChoices.from ?? [];
		this.skillProficiencies = Object.entries(valueByKey)
			.filter(
				([k, v]) => v === true && fromList.includes(k) && !granted.includes(k)
			)
			.map(([k]) => k);

		// Expertises déjà choisies (liste de clés de compétences).
		if (Array.isArray(valueByKey.expertises)) {
			this.expertises = valueByKey.expertises as string[];
		}

		// Lore = valeurs des champs des étapes loreForm.
		const lore: Record<string, string> = {};
		for (const s of this.steps) {
			if (s.kind !== "loreForm") continue;
			const fields = (s.config as { fields?: string[] }).fields ?? [];
			for (const f of fields) {
				const v = valueByKey[f];
				if (typeof v === "string" && v) lore[f] = v;
			}
		}
		this.lore = lore;

		// Inventaire & or : conservés tels quels tant que la bourse n'est pas relancée.
		this.existingInventory = ofKey("equipement").map((s) => ({
			slug: s.slug,
			qty: Number(s.qty ?? 1),
		}));
		this.existingGold = detail.gold == null ? null : Number(detail.gold);
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
				if (key === "sous-classe")
					return this.subclassChoices.every(
						(c) => this.subclassSelections[c.classSlug]
					);
				return true;
			}
			case "repeatableSelection":
				return this.classes.length > 0 && this.totalLevel > 0;
			case "hitPoints":
				// Méthode « lancer » : il faut avoir lancé les dés requis.
				return this.hpMethod !== "roll" || this.hpRollsDone;
			case "abilityImprovement":
				return this.improvementsComplete;
			case "inventory":
				// En ré-édition, l'inventaire existant est conservé tant qu'on ne
				// relance pas la bourse. Sinon : bourse lancée et non à découvert.
				if (this.keepExistingInventory) return true;
				return this.goldRollDone && this.availableGold >= 0;
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
			// Sorts rattachés à leur classe + rôle. On n'envoie que les classes
			// encore retenues (évite les sorts orphelins après un changement).
			const classSlugs = this.classes.map((c) => c.slug);
			const spells: { slug: string; classSlug: string; role: SpellRole }[] = [];
			for (const [classSlug, sel] of Object.entries(this.spellSelections)) {
				if (!classSlugs.includes(classSlug)) continue;
				for (const slug of sel.cantrips ?? [])
					spells.push({ slug, classSlug, role: "cantrip" });
				for (const slug of sel.spellbook ?? [])
					spells.push({ slug, classSlug, role: "book" });
				for (const slug of sel.spells ?? [])
					spells.push({ slug, classSlug, role: "spell" });
			}

			// Sous-classes choisies, rattachées à leur classe (celles encore retenues).
			const subclasses = Object.entries(this.subclassSelections)
				.filter(([classSlug]) => classSlugs.includes(classSlug))
				.map(([classSlug, slug]) => ({ classSlug, slug }));

			// En ré-édition, l'inventaire et l'or existants sont préservés tant que
			// la bourse n'a pas été relancée (évite d'écraser l'équipement).
			const inventory = this.keepExistingInventory
				? this.existingInventory
				: this.finalInventory;
			// `gold` est stocké en entier (colonne Int) : on arrondit pour éviter
			// l'échec d'écriture en cas de revente à demi-valeur (coût impair / 2).
			const gold = this.keepExistingInventory
				? (this.existingGold ?? 0)
				: Math.max(0, Math.round(this.availableGold));

			const body: BuildCharacterData = {
				raceSlug: this.raceSlug ?? "",
				classes: this.classes,
				subclasses,
				backgroundSlug: this.backgroundSlug ?? "",
				abilityMethod: this.abilityMethod,
				abilityScores: this.baseScores,
				hpMethod: this.hpMethod,
				hpMax: this.maxHp,
				skillProficiencies: this.skillProficiencies,
				expertise: this.expertises,
				asiAllocations: this.improvements
					.filter((i) => i.type === "asi")
					.map((i) => (i as { abilities: Record<string, number> }).abilities),
				feats: this.improvements
					.filter((i) => i.type === "feat")
					.map((i) => (i as { slug: string }).slug),
				spells,
				inventory,
				gold,
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
