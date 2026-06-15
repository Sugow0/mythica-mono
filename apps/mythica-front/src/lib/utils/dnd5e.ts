/** Helpers de la fiche D&D 5e — logique pure, testable hors composant. */

export type Ability = { key: string; label: string; abbr: string };

/** Les 6 caractéristiques de base de D&D 5e, dans l'ordre canonique. */
export const DND5E_ABILITIES: Ability[] = [
	{ key: "force", label: "Force", abbr: "FOR" },
	{ key: "dexterite", label: "Dextérité", abbr: "DEX" },
	{ key: "constitution", label: "Constitution", abbr: "CON" },
	{ key: "intelligence", label: "Intelligence", abbr: "INT" },
	{ key: "sagesse", label: "Sagesse", abbr: "SAG" },
	{ key: "charisme", label: "Charisme", abbr: "CHA" },
];

/** Valeur de caractéristique par défaut (D&D 5e). */
export const DEFAULT_ABILITY_SCORE = 10;

/** Modificateur D&D 5e d'une caractéristique : floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

/** Formate un modificateur avec son signe explicite (+2, -1, +0). */
export function formatModifier(modifier: number): string {
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export type Skill = { key: string; label: string; ability: string };

/** Les 18 compétences de D&D 5e, chacune rattachée à une caractéristique. */
export const DND5E_SKILLS: Skill[] = [
	{ key: "acrobaties", label: "Acrobaties", ability: "dexterite" },
	{ key: "arcanes", label: "Arcanes", ability: "intelligence" },
	{ key: "athletisme", label: "Athlétisme", ability: "force" },
	{ key: "discretion", label: "Discrétion", ability: "dexterite" },
	{ key: "dressage", label: "Dressage", ability: "sagesse" },
	{ key: "escamotage", label: "Escamotage", ability: "dexterite" },
	{ key: "histoire", label: "Histoire", ability: "intelligence" },
	{ key: "intimidation", label: "Intimidation", ability: "charisme" },
	{ key: "intuition", label: "Intuition", ability: "sagesse" },
	{ key: "investigation", label: "Investigation", ability: "intelligence" },
	{ key: "medecine", label: "Médecine", ability: "sagesse" },
	{ key: "nature", label: "Nature", ability: "intelligence" },
	{ key: "perception", label: "Perception", ability: "sagesse" },
	{ key: "persuasion", label: "Persuasion", ability: "charisme" },
	{ key: "religion", label: "Religion", ability: "intelligence" },
	{ key: "representation", label: "Représentation", ability: "charisme" },
	{ key: "survie", label: "Survie", ability: "sagesse" },
	{ key: "tromperie", label: "Tromperie", ability: "charisme" },
];

/** Bonus de maîtrise par défaut (niveau 1-4). */
export const DEFAULT_PROFICIENCY_BONUS = 2;

/** Bonus de maîtrise D&D 5e en fonction du niveau (1→+2, 5→+3, …, 17-20→+6). */
export function proficiencyBonusForLevel(level: number): number {
	const clamped = Math.min(20, Math.max(1, Math.floor(level)));
	return 2 + Math.floor((clamped - 1) / 4);
}

/**
 * Bonus total d'une compétence ou d'un jet de sauvegarde :
 * modificateur de caractéristique + bonus de maîtrise si maîtrisé.
 */
export function skillBonus(
	abilityScore: number,
	proficient: boolean,
	proficiencyBonus = DEFAULT_PROFICIENCY_BONUS
): number {
	return abilityModifier(abilityScore) + (proficient ? proficiencyBonus : 0);
}

/** Résultat d'un jet de d20 (+ modificateur). */
export type D20Roll = { roll: number; modifier: number; total: number };

/** Lance 1d20 + modificateur. `rng` injectable pour des tests déterministes. */
export function rollD20(
	modifier: number,
	rng: () => number = Math.random
): D20Roll {
	const roll = Math.floor(rng() * 20) + 1;
	return { roll, modifier, total: roll + modifier };
}

export type CharacterState = { key: string; label: string };

/** États possibles d'un personnage (D&D 5e simplifié). */
export const DND5E_CHARACTER_STATES: CharacterState[] = [
	{ key: "normal", label: "Normal" },
	{ key: "stabilise", label: "Stabilisé" },
	{ key: "mort", label: "Mort" },
];

export type HpState = { current: number; temp: number; max: number };

/**
 * Applique une variation de PV. Les dégâts (delta < 0) entament d'abord les PV
 * temporaires puis les PV courants (plancher 0) ; les soins (delta > 0)
 * augmentent les PV courants sans dépasser le maximum (les PV temp ne sont pas
 * soignés). Retourne les nouveaux { current, temp }.
 */
export function adjustHp(
	state: HpState,
	delta: number
): { current: number; temp: number } {
	if (delta >= 0) {
		return {
			current: Math.min(state.max, state.current + delta),
			temp: state.temp,
		};
	}
	let damage = -delta;
	let temp = state.temp;
	if (temp > 0) {
		const absorbed = Math.min(temp, damage);
		temp -= absorbed;
		damage -= absorbed;
	}
	return { current: Math.max(0, state.current - damage), temp };
}
