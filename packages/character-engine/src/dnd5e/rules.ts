/**
 * Règles de calcul D&D 5e (2014) : modificateurs, bonus de maîtrise,
 * emplacements de sorts (mono-classe et multiclasse) et prérequis de
 * multiclassage. Fonctions pures, partagées front (preview) / back (validation).
 */

import { type Rng, rollDice } from "../allocation";
import type {
	AbilityScores,
	CasterType,
	ClassBuild,
	HitPointsMethod,
} from "../types";
import {
	FULL_CASTER_SLOTS,
	HALF_CASTER_SLOTS,
	MULTICLASS_SLOTS,
	PACT_MAGIC,
	THIRD_CASTER_SLOTS,
} from "./slots";

/** Modificateur de caractéristique : `floor((score - 10) / 2)`. */
export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

/** Bonus de maîtrise selon le niveau total : +2 (1-4) … +6 (17-20). */
export function proficiencyBonus(totalLevel: number): number {
	return Math.floor((Math.max(1, totalLevel) - 1) / 4) + 2;
}

function clampLevel(level: number, max: number): number {
	return Math.max(0, Math.min(level, max));
}

/** Emplacements (par niveau de sort, 1..9) d'une classe seule selon sa catégorie. */
export function singleClassSlots(
	casterType: CasterType,
	level: number,
): number[] {
	const empty = Array(9).fill(0) as number[];
	switch (casterType) {
		case "full":
			return [...FULL_CASTER_SLOTS[clampLevel(level, 20)]];
		case "half": {
			const slots = HALF_CASTER_SLOTS[clampLevel(level, 20)];
			return [...slots, ...Array(9 - slots.length).fill(0)];
		}
		case "third": {
			const slots = THIRD_CASTER_SLOTS[clampLevel(level, 20)];
			return [...slots, ...Array(9 - slots.length).fill(0)];
		}
		default:
			return empty;
	}
}

/** Magie de pacte de l'occultiste à un niveau donné. */
export function pactMagic(level: number): { count: number; slotLevel: number } {
	return { ...PACT_MAGIC[clampLevel(level, 20)] };
}

/**
 * Niveau de lanceur combiné pour le multiclassage (PHB p.165) :
 * full ×1, half ÷2 (arrondi inf.), third ÷3 (arrondi inf.). L'occultiste
 * (magie de pacte) est exclu et géré séparément.
 */
export function multiclassCasterLevel(classes: ClassBuild[]): number {
	let level = 0;
	for (const c of classes) {
		switch (c.casterType) {
			case "full":
				level += c.level;
				break;
			case "half":
				level += Math.floor(c.level / 2);
				break;
			case "third":
				level += Math.floor(c.level / 3);
				break;
		}
	}
	return level;
}

/** Résultat de calcul des emplacements d'un personnage. */
export type SpellSlotsResult = {
	/** Emplacements « classiques » par niveau de sort (1..9). */
	slots: number[];
	/** Magie de pacte (occultiste), si applicable. */
	pact?: { count: number; slotLevel: number };
};

/**
 * Calcule les emplacements de sorts d'un personnage, mono- ou multiclasse.
 *
 * Règle : une **seule** classe lanceuse non-occultiste → on utilise sa propre
 * table (le demi/tiers-lanceur n'est pas converti) ; **plusieurs** → table
 * unifiée du multiclasseur sur le niveau combiné. L'occultiste ajoute sa magie
 * de pacte indépendamment.
 */
export function computeSpellSlots(classes: ClassBuild[]): SpellSlotsResult {
	const casters = classes.filter(
		(c) => c.casterType && c.casterType !== "none",
	);
	const warlock = casters.find((c) => c.casterType === "warlock");
	const others = casters.filter((c) => c.casterType !== "warlock");

	let slots = Array(9).fill(0) as number[];
	if (others.length === 1) {
		slots = singleClassSlots(others[0].casterType ?? "none", others[0].level);
	} else if (others.length > 1) {
		const level = multiclassCasterLevel(others);
		slots = level > 0 ? [...MULTICLASS_SLOTS[clampLevel(level, 20)]] : slots;
	}

	const result: SpellSlotsResult = { slots };
	if (warlock) result.pact = pactMagic(warlock.level);
	return result;
}

// --- Points de vie & dés de vie ---------------------------------------------

/** Une classe du build pour le calcul des PV / dés de vie. */
export type HitDieClass = {
	/** Type de dé de vie (6, 8, 10 ou 12). */
	hitDie: number;
	/** Niveau atteint dans cette classe. */
	level: number;
	/** Classe principale : son 1er niveau octroie le maximum du dé. */
	isPrimary?: boolean;
};

/** Valeur moyenne d'un dé de vie (PHB) : `floor(dé / 2) + 1` (d6→4, d8→5…). */
export function averageHitDie(hitDie: number): number {
	return Math.floor(hitDie / 2) + 1;
}

/** Détail d'un niveau dans le calcul des PV. */
export type HitPointsEntry = {
	hitDie: number;
	/** Valeur du dé (avant modificateur de Constitution). */
	base: number;
	/** Origine de la valeur. */
	source: "max" | "average" | "roll";
};

/** Résultat du calcul des points de vie. */
export type HitPointsResult = {
	/** PV maximum (somme des dés + mod. Constitution par niveau, plancher 1/niveau). */
	maxHp: number;
	/** Détail par niveau, classe principale en tête. */
	breakdown: HitPointsEntry[];
};

/** Ordonne les classes pour le calcul des PV (principale en tête). */
function orderClassesForHp(classes: HitDieClass[]): HitDieClass[] {
	const primaryIndex = classes.findIndex((c) => c.isPrimary);
	if (primaryIndex <= 0) return classes;
	const ordered = [...classes];
	const [primary] = ordered.splice(primaryIndex, 1);
	ordered.unshift(primary);
	return ordered;
}

/**
 * Nombre de niveaux dont le dé est réellement lancé (tous sauf le tout premier
 * niveau du personnage, qui prend le maximum du dé).
 */
export function rolledHitDiceCount(classes: HitDieClass[]): number {
	const total = classes.reduce((sum, c) => sum + Math.max(0, c.level), 0);
	return Math.max(0, total - 1);
}

/**
 * Calcule les PV d'un personnage (mono- ou multiclasse).
 *
 * Le tout premier niveau (1er niveau de la classe principale) octroie le maximum
 * du dé ; les niveaux suivants prennent la moyenne (`average`) ou un lancer
 * (`roll`, via `rolls` dans l'ordre — classe principale d'abord). Chaque niveau
 * ajoute le modificateur de Constitution, avec un plancher de 1 PV par niveau.
 */
export function computeHitPoints(params: {
	classes: HitDieClass[];
	conMod: number;
	method: HitPointsMethod;
	/** Valeurs lancées (méthode `roll`), une par niveau hors tout premier. */
	rolls?: number[];
	/** Total saisi (méthode `manual`). */
	manualTotal?: number;
}): HitPointsResult {
	const { classes, conMod, method, rolls = [], manualTotal } = params;
	if (method === "manual") {
		return { maxHp: Math.max(0, manualTotal ?? 0), breakdown: [] };
	}

	const breakdown: HitPointsEntry[] = [];
	let rollIdx = 0;
	let first = true;
	for (const c of orderClassesForHp(classes)) {
		for (let lvl = 0; lvl < Math.max(0, c.level); lvl++) {
			if (first) {
				breakdown.push({ hitDie: c.hitDie, base: c.hitDie, source: "max" });
				first = false;
			} else if (method === "roll") {
				const rolled = rolls[rollIdx++] ?? averageHitDie(c.hitDie);
				breakdown.push({ hitDie: c.hitDie, base: rolled, source: "roll" });
			} else {
				breakdown.push({
					hitDie: c.hitDie,
					base: averageHitDie(c.hitDie),
					source: "average",
				});
			}
		}
	}

	const maxHp = breakdown.reduce(
		(sum, e) => sum + Math.max(1, e.base + conMod),
		0,
	);
	return { maxHp, breakdown };
}

/** Tire les dés de vie des niveaux concernés (méthode `roll`), classe principale d'abord. */
export function rollHitPointDice(
	classes: HitDieClass[],
	rng: Rng = Math.random,
): number[] {
	const rolls: number[] = [];
	let first = true;
	for (const c of orderClassesForHp(classes)) {
		for (let lvl = 0; lvl < Math.max(0, c.level); lvl++) {
			if (first) {
				first = false;
				continue;
			}
			rolls.push(rollDice(1, c.hitDie, rng));
		}
	}
	return rolls;
}

/** Réserve de dés de vie, regroupée par taille de dé : `{ "6": {current,max} }`. */
export type HitDicePool = Record<string, { current: number; max: number }>;

/** Calcule les dés de vie disponibles, regroupés par taille (multiclasse compris). */
export function computeHitDice(classes: HitDieClass[]): HitDicePool {
	const pool: HitDicePool = {};
	for (const c of classes) {
		const level = Math.max(0, c.level);
		if (level === 0) continue;
		const key = String(c.hitDie);
		const entry = pool[key] ?? { current: 0, max: 0 };
		entry.current += level;
		entry.max += level;
		pool[key] = entry;
	}
	return pool;
}

/** Vérifie les prérequis de caractéristiques pour multiclasser. */
export function meetsMulticlassPrereq(
	requirements: AbilityScores,
	scores: AbilityScores,
): boolean {
	return Object.entries(requirements).every(
		([key, min]) => (scores[key] ?? 0) >= min,
	);
}

// --- Sélection des sorts (distincte des emplacements) -----------------------

/** Niveau de sort maximum accessible d'après une liste d'emplacements [L1..L9]. */
export function maxSpellSlotLevel(slots: number[]): number {
	for (let i = slots.length - 1; i >= 0; i--) {
		if ((slots[i] ?? 0) > 0) return i + 1;
	}
	return 0;
}

/**
 * Nombre de sorts préparés : `max(1, mod + niveau)` (préparant complet) ou
 * `max(1, mod + floor(niveau/2))` (demi-préparant comme le paladin).
 */
export function preparedSpellsCount(
	abilityMod: number,
	classLevel: number,
	half = false,
): number {
	const effective = half ? Math.floor(classLevel / 2) : classLevel;
	return Math.max(1, abilityMod + effective);
}

/** Taille du grimoire du magicien : 6 sorts au niveau 1, +2 par niveau suivant. */
export function wizardSpellbookSize(classLevel: number): number {
	return 6 + 2 * (Math.max(1, classLevel) - 1);
}

/** Une tranche d'expertise accordée à un niveau donné (classe). */
export type ExpertiseGrant = { level: number; count: number };

/**
 * Nombre d'expertises (double maîtrise) disponibles à un niveau de classe :
 * somme des tranches dont le niveau est atteint.
 */
export function expertiseSlots(
	grants: ExpertiseGrant[] | undefined,
	classLevel: number,
): number {
	if (!grants) return 0;
	return grants.reduce(
		(sum, g) => (classLevel >= g.level ? sum + g.count : sum),
		0,
	);
}

/**
 * Nombre de sorts préparés selon le type de lanceur, ou `null` si la classe ne
 * prépare pas ses sorts (lanceurs « connus », pacte…). `prepared`/`wizard`
 * préparent en complet ; `prepared_half` (paladin) en demi.
 */
export function preparedSpellsForKind(
	kind: string | undefined,
	abilityMod: number,
	classLevel: number,
): number | null {
	if (kind === "prepared" || kind === "wizard") {
		return preparedSpellsCount(abilityMod, classLevel);
	}
	if (kind === "prepared_half") {
		return preparedSpellsCount(abilityMod, classLevel, true);
	}
	return null;
}

/**
 * Fonctions D&D exposées au registre de l'évaluateur de formules. Permet aux
 * formules de propriétés d'écrire `mod(dexterite)` ou `prof(niveau)`.
 */
export const DND5E_FORMULA_FUNCTIONS = {
	mod: abilityModifier,
	prof: proficiencyBonus,
};
