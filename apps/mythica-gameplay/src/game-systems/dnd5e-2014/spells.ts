/**
 * Sorts D&D 5e (2014) — sous-ensemble curé (tours de magie + niveaux 1-2) pour
 * les classes lanceuses de la verticale. `classes` liste les slugs de classes
 * pouvant apprendre le sort.
 */

import type { SpellData, SystemContentSeed } from "./types";

const spell = (
	slug: string,
	name: string,
	data: SpellData,
	sortOrder: number,
): SystemContentSeed => ({
	collectionKey: "sort",
	slug,
	name,
	sortOrder,
	data: data as unknown as Record<string, unknown>,
});

export const DND5E_SPELLS: SystemContentSeed[] = [
	// — Tours de magie (niveau 0) —
	spell(
		"trait-de-feu",
		"Trait de feu",
		{
			level: 0,
			school: "Évocation",
			castingTime: "1 action",
			range: "36 mètres",
			components: "V, S",
			duration: "Instantanée",
			classes: ["magicien", "occultiste"],
		},
		0,
	),
	spell(
		"prestidigitation",
		"Prestidigitation",
		{
			level: 0,
			school: "Transmutation",
			castingTime: "1 action",
			range: "3 mètres",
			components: "V, S",
			duration: "Jusqu'à 1 heure",
			classes: ["magicien", "occultiste"],
		},
		1,
	),
	spell(
		"flamme-sacree",
		"Flamme sacrée",
		{
			level: 0,
			school: "Évocation",
			castingTime: "1 action",
			range: "18 mètres",
			components: "V, S",
			duration: "Instantanée",
			classes: ["clerc"],
		},
		2,
	),
	// — Niveau 1 —
	spell(
		"projectile-magique",
		"Projectile magique",
		{
			level: 1,
			school: "Évocation",
			castingTime: "1 action",
			range: "36 mètres",
			components: "V, S",
			duration: "Instantanée",
			classes: ["magicien"],
		},
		3,
	),
	spell(
		"bouclier",
		"Bouclier",
		{
			level: 1,
			school: "Abjuration",
			castingTime: "1 réaction",
			range: "Personnel",
			components: "V, S",
			duration: "1 round",
			classes: ["magicien"],
		},
		4,
	),
	spell(
		"soin-des-blessures",
		"Soin des blessures",
		{
			level: 1,
			school: "Évocation",
			castingTime: "1 action",
			range: "Contact",
			components: "V, S",
			duration: "Instantanée",
			classes: ["clerc", "paladin"],
		},
		5,
	),
	spell(
		"injonction",
		"Injonction",
		{
			level: 1,
			school: "Enchantement",
			castingTime: "1 action",
			range: "18 mètres",
			components: "V",
			duration: "1 round",
			classes: ["clerc", "paladin"],
		},
		6,
	),
	spell(
		"charme-personne",
		"Charme-personne",
		{
			level: 1,
			school: "Enchantement",
			castingTime: "1 action",
			range: "9 mètres",
			components: "V, S",
			duration: "1 heure",
			classes: ["magicien", "occultiste"],
		},
		7,
	),
	// — Niveau 2 —
	spell(
		"image-miroir",
		"Image miroir",
		{
			level: 2,
			school: "Illusion",
			castingTime: "1 action",
			range: "Personnel",
			components: "V, S",
			duration: "1 minute",
			classes: ["magicien", "occultiste"],
		},
		8,
	),
	spell(
		"immobilisation-de-personne",
		"Immobilisation de personne",
		{
			level: 2,
			school: "Enchantement",
			castingTime: "1 action",
			range: "18 mètres",
			components: "V, S, M",
			duration: "Concentration, jusqu'à 1 minute",
			classes: ["clerc", "magicien", "paladin"],
		},
		9,
	),
];
