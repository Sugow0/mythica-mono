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
	artificier: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
	barde: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
	clerc: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
	druide: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
	ensorceleur: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
	magicien: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
	sorcier: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
};

/** Tiers-lanceurs (chevalier occulte / escroc arcanique), par niveau de classe. */
export const THIRD_CASTER = {
	/** Sorts connus (identique EK/AT) : premiers sorts au niveau 3. */
	spellsKnown: [
		0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
	],
	/** Tours de magie — chevalier occulte (2 au niv 3, 3 au niv 10). */
	cantripsKnownEK: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
	/** Tours de magie — escroc arcanique (3 dès le niveau 3, dont main du mage). */
	cantripsKnownAT: [0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
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
