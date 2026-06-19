/**
 * Tables de progression des sorts D&D 5e (2014), par classe et par niveau (1→20).
 * Valeurs officielles (PHB / aidedd) : nombre de tours de magie connus et, pour
 * les classes « connaissantes », nombre de sorts connus.
 *
 * Les *préparants* (clerc, druide, paladin, magicien) n'ont pas de table de
 * sorts connus : le nombre préparé se calcule par formule (mod + niveau, ou
 * mod + floor(niveau/2) pour le paladin). Le niveau de sort maximum accessible
 * est dérivé des tables d'emplacements (character-engine).
 */

/** Mécanique de sélection des sorts d'une classe lanceuse. */
export type SpellcastingKind =
	| "prepared" // préparant complet (clerc, druide)
	| "prepared_half" // demi-préparant (paladin)
	| "known" // connaissant complet (barde, ensorceleur)
	| "known_half" // demi-connaissant (rôdeur)
	| "wizard" // hybride grimoire (magicien)
	| "pact"; // magie de pacte (occultiste/sorcier)

/** Tours de magie connus par niveau (index 0 = niveau 1). */
export const CANTRIPS_KNOWN: Record<string, number[]> = {
	barde: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
	clerc: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
	druide: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
	ensorceleur: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
	magicien: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
	sorcier: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
};

/** Sorts connus par niveau (classes connaissantes uniquement). */
export const SPELLS_KNOWN: Record<string, number[]> = {
	barde: [
		4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22,
	],
	ensorceleur: [
		2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15,
	],
	rodeur: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
	sorcier: [
		2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15,
	],
};
