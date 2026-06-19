/**
 * Tables d'emplacements de sorts D&D 5e (édition 2014, SRD/PHB). Données pures et
 * stables. Indexées par niveau de classe (1..20). Chaque entrée liste les
 * emplacements par niveau de sort.
 *
 * Ces tables sont de la **règle de calcul**, partagée entre le preview front et
 * la validation back ; le *contenu* (races, classes...) vit en base, pas ici.
 */

/** Emplacements du lanceur complet : index 0 = inutilisé, 1..20 = niveau. [L1..L9]. */
export const FULL_CASTER_SLOTS: number[][] = [
	[0, 0, 0, 0, 0, 0, 0, 0, 0], // niveau 0 (placeholder)
	[2, 0, 0, 0, 0, 0, 0, 0, 0],
	[3, 0, 0, 0, 0, 0, 0, 0, 0],
	[4, 2, 0, 0, 0, 0, 0, 0, 0],
	[4, 3, 0, 0, 0, 0, 0, 0, 0],
	[4, 3, 2, 0, 0, 0, 0, 0, 0],
	[4, 3, 3, 0, 0, 0, 0, 0, 0],
	[4, 3, 3, 1, 0, 0, 0, 0, 0],
	[4, 3, 3, 2, 0, 0, 0, 0, 0],
	[4, 3, 3, 3, 1, 0, 0, 0, 0],
	[4, 3, 3, 3, 2, 0, 0, 0, 0],
	[4, 3, 3, 3, 2, 1, 0, 0, 0],
	[4, 3, 3, 3, 2, 1, 0, 0, 0],
	[4, 3, 3, 3, 2, 1, 1, 0, 0],
	[4, 3, 3, 3, 2, 1, 1, 0, 0],
	[4, 3, 3, 3, 2, 1, 1, 1, 0],
	[4, 3, 3, 3, 2, 1, 1, 1, 0],
	[4, 3, 3, 3, 2, 1, 1, 1, 1],
	[4, 3, 3, 3, 3, 1, 1, 1, 1],
	[4, 3, 3, 3, 3, 2, 1, 1, 1],
	[4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/**
 * Table unifiée du multiclasseur = table du lanceur complet, indexée par le
 * **niveau de lanceur combiné** (PHB p.165).
 */
export const MULTICLASS_SLOTS = FULL_CASTER_SLOTS;

/** Emplacements du demi-lanceur (paladin, rôdeur). [L1..L5]. */
export const HALF_CASTER_SLOTS: number[][] = [
	[0, 0, 0, 0, 0], // niveau 0
	[0, 0, 0, 0, 0],
	[2, 0, 0, 0, 0],
	[3, 0, 0, 0, 0],
	[3, 0, 0, 0, 0],
	[4, 2, 0, 0, 0],
	[4, 2, 0, 0, 0],
	[4, 3, 0, 0, 0],
	[4, 3, 0, 0, 0],
	[4, 3, 2, 0, 0],
	[4, 3, 2, 0, 0],
	[4, 3, 3, 0, 0],
	[4, 3, 3, 0, 0],
	[4, 3, 3, 1, 0],
	[4, 3, 3, 1, 0],
	[4, 3, 3, 2, 0],
	[4, 3, 3, 2, 0],
	[4, 3, 3, 3, 1],
	[4, 3, 3, 3, 1],
	[4, 3, 3, 3, 2],
	[4, 3, 3, 3, 2],
];

/** Emplacements du tiers-lanceur (chevalier occulte, escroc arcanique). [L1..L4]. */
export const THIRD_CASTER_SLOTS: number[][] = [
	[0, 0, 0, 0], // niveau 0
	[0, 0, 0, 0],
	[0, 0, 0, 0],
	[2, 0, 0, 0],
	[3, 0, 0, 0],
	[3, 0, 0, 0],
	[3, 0, 0, 0],
	[4, 2, 0, 0],
	[4, 2, 0, 0],
	[4, 2, 0, 0],
	[4, 3, 0, 0],
	[4, 3, 0, 0],
	[4, 3, 0, 0],
	[4, 3, 2, 0],
	[4, 3, 2, 0],
	[4, 3, 2, 0],
	[4, 3, 3, 0],
	[4, 3, 3, 0],
	[4, 3, 3, 0],
	[4, 3, 3, 1],
	[4, 3, 3, 1],
];

/** Magie de pacte de l'occultiste : nombre d'emplacements et niveau, par niveau. */
export const PACT_MAGIC: { count: number; slotLevel: number }[] = [
	{ count: 0, slotLevel: 0 }, // niveau 0
	{ count: 1, slotLevel: 1 },
	{ count: 2, slotLevel: 1 },
	{ count: 2, slotLevel: 2 },
	{ count: 2, slotLevel: 2 },
	{ count: 2, slotLevel: 3 },
	{ count: 2, slotLevel: 3 },
	{ count: 2, slotLevel: 4 },
	{ count: 2, slotLevel: 4 },
	{ count: 2, slotLevel: 5 },
	{ count: 2, slotLevel: 5 },
	{ count: 3, slotLevel: 5 },
	{ count: 3, slotLevel: 5 },
	{ count: 3, slotLevel: 5 },
	{ count: 3, slotLevel: 5 },
	{ count: 3, slotLevel: 5 },
	{ count: 3, slotLevel: 5 },
	{ count: 4, slotLevel: 5 },
	{ count: 4, slotLevel: 5 },
	{ count: 4, slotLevel: 5 },
	{ count: 4, slotLevel: 5 },
];
