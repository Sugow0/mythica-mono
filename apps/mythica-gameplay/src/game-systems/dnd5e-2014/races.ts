/**
 * Races D&D 5e (2014) — sous-ensemble curé. Données pures, idempotentes par
 * `slug`. Les sous-races courantes sont modélisées comme races à part entière
 * pour la verticale (le sous-choix arrivera avec le contenu complet).
 */

import type { RaceData, SystemContentSeed } from "./types";

const race = (
	slug: string,
	name: string,
	description: string,
	data: RaceData,
	sortOrder: number,
): SystemContentSeed => ({
	collectionKey: "race",
	slug,
	name,
	description,
	sortOrder,
	data: data as unknown as Record<string, unknown>,
});

export const DND5E_RACES: SystemContentSeed[] = [
	race(
		"humain",
		"Humain",
		"Polyvalents et ambitieux, les humains s'adaptent à tous les rôles.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: {
				force: 1,
				dexterite: 1,
				constitution: 1,
				intelligence: 1,
				sagesse: 1,
				charisme: 1,
			},
			languages: ["Commun", "une langue au choix"],
			traits: [
				{
					name: "Polyvalence",
					description: "+1 à chacune des six caractéristiques.",
				},
			],
		},
		0,
	),
	race(
		"haut-elfe",
		"Haut-elfe",
		"Élégants et érudits, les hauts-elfes excellent dans la magie et la perception.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { dexterite: 2, intelligence: 1 },
			languages: ["Commun", "Elfique", "une langue au choix"],
			skillProficiencies: ["perception"],
			traits: [
				{
					name: "Vision dans le noir",
					description: "Vision à 18 m dans la pénombre.",
				},
				{
					name: "Ascendance féerique",
					description:
						"Avantage contre l'état charmé ; immunité au sommeil magique.",
				},
				{
					name: "Tour de magie",
					description: "Connaît un tour de magie de la liste de magicien.",
				},
			],
		},
		1,
	),
	race(
		"nain-collines",
		"Nain des collines",
		"Robustes et tenaces, les nains des collines sont réputés pour leur résistance.",
		{
			size: "M",
			speed: 7.5,
			abilityBonuses: { constitution: 2, sagesse: 1 },
			languages: ["Commun", "Nain"],
			traits: [
				{
					name: "Vision dans le noir",
					description: "Vision à 18 m dans la pénombre.",
				},
				{
					name: "Résistance naine",
					description:
						"Avantage contre le poison ; résistance aux dégâts de poison.",
				},
				{
					name: "Ténacité naine",
					description: "+1 PV maximum par niveau.",
				},
			],
		},
		2,
	),
	race(
		"halfelin-pied-leger",
		"Halfelin pied-léger",
		"Discrets et chanceux, les halfelins pieds-légers passent facilement inaperçus.",
		{
			size: "P",
			speed: 7.5,
			abilityBonuses: { dexterite: 2, charisme: 1 },
			languages: ["Commun", "Halfelin"],
			traits: [
				{
					name: "Chanceux",
					description:
						"Relance les 1 obtenus aux tests d'attaque, de caractéristique et de sauvegarde.",
				},
				{
					name: "Brave",
					description: "Avantage contre l'état effrayé.",
				},
				{
					name: "Discrétion naturelle",
					description: "Peut se cacher derrière une créature plus grande.",
				},
			],
		},
		3,
	),
	race(
		"demi-orc",
		"Demi-orc",
		"Puissants et endurants, les demi-orcs sont des combattants redoutables.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { force: 2, constitution: 1 },
			languages: ["Commun", "Orc"],
			skillProficiencies: ["intimidation"],
			traits: [
				{
					name: "Vision dans le noir",
					description: "Vision à 18 m dans la pénombre.",
				},
				{
					name: "Endurance implacable",
					description: "Tombe à 1 PV au lieu de 0 une fois par repos long.",
				},
				{
					name: "Attaques sauvages",
					description:
						"Un dé de dégâts supplémentaire sur un coup critique au corps à corps.",
				},
			],
		},
		4,
	),
	race(
		"drakeide",
		"Drakéide",
		"Fiers descendants des dragons, les drakéides exhalent une énergie élémentaire.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { force: 2, charisme: 1 },
			languages: ["Commun", "Draconique"],
			traits: [
				{
					name: "Souffle élémentaire",
					description:
						"Exhale une énergie selon son ascendance draconique (jet de sauvegarde).",
				},
				{
					name: "Résistance draconique",
					description: "Résistance au type de dégâts de son ascendance.",
				},
			],
		},
		5,
	),
];
