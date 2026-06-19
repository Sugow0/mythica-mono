/**
 * Équipement D&D 5e (2014) — sous-ensemble curé (armes, armures, objets de
 * départ référencés par les classes et backgrounds).
 */

import type { EquipmentData, SystemContentSeed } from "./types";

const item = (
	slug: string,
	name: string,
	data: EquipmentData,
	sortOrder: number,
): SystemContentSeed => ({
	collectionKey: "equipement",
	slug,
	name,
	sortOrder,
	data: data as unknown as Record<string, unknown>,
});

export const DND5E_EQUIPMENT: SystemContentSeed[] = [
	item(
		"epee-longue",
		"Épée longue",
		{
			category: "arme",
			costGp: 15,
			weight: 1.5,
			properties: { degats: "1d8 tranchant", polyvalente: "1d10" },
		},
		0,
	),
	item(
		"epee-courte",
		"Épée courte",
		{
			category: "arme",
			costGp: 10,
			weight: 1,
			properties: { degats: "1d6 perforant", finesse: true, legere: true },
		},
		1,
	),
	item(
		"rapiere",
		"Rapière",
		{
			category: "arme",
			costGp: 25,
			weight: 1,
			properties: { degats: "1d8 perforant", finesse: true },
		},
		2,
	),
	item(
		"masse-darmes",
		"Masse d'armes",
		{
			category: "arme",
			costGp: 5,
			weight: 2,
			properties: { degats: "1d6 contondant" },
		},
		3,
	),
	item(
		"baton",
		"Bâton",
		{
			category: "arme",
			costGp: 0.2,
			weight: 2,
			properties: { degats: "1d6 contondant", polyvalente: "1d8" },
		},
		4,
	),
	item(
		"arbalete-legere",
		"Arbalète légère",
		{
			category: "arme",
			costGp: 25,
			weight: 2.5,
			properties: { degats: "1d8 perforant", distance: "24/96 m" },
		},
		5,
	),
	item(
		"armure-de-cuir",
		"Armure de cuir",
		{
			category: "armure",
			costGp: 10,
			weight: 5,
			properties: { ca: "11 + mod. Dex" },
		},
		6,
	),
	item(
		"armure-decailles",
		"Armure d'écailles",
		{
			category: "armure",
			costGp: 50,
			weight: 22.5,
			properties: { ca: "14 + mod. Dex (max 2)" },
		},
		7,
	),
	item(
		"cotte-de-mailles",
		"Cotte de mailles",
		{
			category: "armure",
			costGp: 75,
			weight: 27.5,
			properties: { ca: "16", forceMin: 13, discretionDesavantage: true },
		},
		8,
	),
	item(
		"bouclier",
		"Bouclier",
		{ category: "bouclier", costGp: 10, weight: 3, properties: { ca: "+2" } },
		9,
	),
	item(
		"grimoire",
		"Grimoire",
		{ category: "objet", costGp: 50, weight: 1.5 },
		10,
	),
	item(
		"symbole-sacre",
		"Symbole sacré",
		{ category: "objet", costGp: 5, weight: 0.5 },
		11,
	),
	item(
		"outils-de-voleur",
		"Outils de voleur",
		{ category: "objet", costGp: 25, weight: 0.5 },
		12,
	),
	item(
		"sacoche-composantes",
		"Sacoche à composantes",
		{ category: "objet", costGp: 25, weight: 1 },
		13,
	),
	item(
		"insigne-de-grade",
		"Insigne de grade",
		{ category: "objet", costGp: 0, weight: 0 },
		14,
	),
];
