/**
 * Règles de calcul D&D 5e (2014) : modificateurs, bonus de maîtrise,
 * emplacements de sorts (mono-classe et multiclasse) et prérequis de
 * multiclassage. Fonctions pures, partagées front (preview) / back (validation).
 */

import type { AbilityScores, CasterType, ClassBuild } from "../types";
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

/**
 * Fonctions D&D exposées au registre de l'évaluateur de formules. Permet aux
 * formules de propriétés d'écrire `mod(dexterite)` ou `prof(niveau)`.
 */
export const DND5E_FORMULA_FUNCTIONS = {
	mod: abilityModifier,
	prof: proficiencyBonus,
};
