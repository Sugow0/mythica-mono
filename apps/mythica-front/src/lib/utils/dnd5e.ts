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
