/**
 * Races D&D 5e (2014) — jeu complet du PHB (chap. 2). Les sous-races sont
 * aplaties en entrées sélectionnables (cumul des bonus/traits race + sous-race),
 * adapté à l'étape de sélection unique du wizard. Nomenclature FR du PHB.
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

const darkvision: RaceData["traits"][number] = {
	name: "Vision dans le noir",
	description:
		"Vision à 18 m dans la pénombre comme en plein jour (nuances de gris).",
};
const feyAncestry: RaceData["traits"][number] = {
	name: "Ascendance féerique",
	description:
		"Avantage aux jets contre l'état charmé ; le sommeil magique est sans effet sur vous.",
};
const trance: RaceData["traits"][number] = {
	name: "Transe",
	description: "Vous ne dormez pas : 4 h de méditation valent un long repos.",
};
const dwarvenResilience: RaceData["traits"][number] = {
	name: "Résistance naine",
	description: "Avantage contre le poison ; résistance aux dégâts de poison.",
};
const gnomeCunning: RaceData["traits"][number] = {
	name: "Ruse gnome",
	description:
		"Avantage aux jets de sauvegarde d'Int, Sag et Cha contre la magie.",
};
const lucky: RaceData["traits"][number] = {
	name: "Chanceux",
	description:
		"Relancez les 1 obtenus aux jets d'attaque, de caractéristique et de sauvegarde.",
};
const brave: RaceData["traits"][number] = {
	name: "Brave",
	description: "Avantage aux jets de sauvegarde contre l'état effrayé.",
};
const halflingNimble: RaceData["traits"][number] = {
	name: "Agilité halfeline",
	description:
		"Vous pouvez traverser l'espace d'une créature de taille supérieure.",
};

export const DND5E_RACES: SystemContentSeed[] = [
	// — Elfe —
	race(
		"haut-elfe",
		"Haut-elfe",
		"Fiers et cultivés, les hauts-elfes maîtrisent une magie élémentaire.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { dexterite: 2, intelligence: 1 },
			languages: ["Commun", "Elfique", "une langue au choix"],
			skillProficiencies: ["perception"],
			traits: [
				darkvision,
				feyAncestry,
				trance,
				{
					name: "Tour de magie",
					description:
						"Vous connaissez un tour de magie de la liste de magicien (Int).",
				},
			],
		},
		0,
	),
	race(
		"elfe-des-bois",
		"Elfe des bois",
		"Discrets et endurants, les elfes des bois vivent en harmonie avec la nature.",
		{
			size: "M",
			speed: 10.5,
			abilityBonuses: { dexterite: 2, sagesse: 1 },
			languages: ["Commun", "Elfique"],
			skillProficiencies: ["perception"],
			traits: [
				darkvision,
				feyAncestry,
				trance,
				{
					name: "Masque de la nature",
					description:
						"Vous pouvez tenter de vous cacher même dans un terrain peu couvrant.",
				},
			],
		},
		1,
	),
	race(
		"drow",
		"Drow (elfe noir)",
		"Habitants de l'Outreterre, les drows manient une magie ténébreuse.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { dexterite: 2, charisme: 1 },
			languages: ["Commun", "Elfique"],
			skillProficiencies: ["perception"],
			traits: [
				{
					name: "Vision dans le noir supérieure",
					description: "Vision dans le noir à 36 m.",
				},
				feyAncestry,
				trance,
				{
					name: "Sensibilité au soleil",
					description: "Désavantage à la vue et aux attaques en plein soleil.",
				},
				{
					name: "Magie drow",
					description:
						"Tour de magie lueurs féeriques, puis ténèbres et lumières dansantes selon le niveau (Cha).",
				},
			],
		},
		2,
	),
	// — Halfelin —
	race(
		"halfelin-pied-leger",
		"Halfelin pied-léger",
		"Discrets et affables, ils passent facilement inaperçus.",
		{
			size: "P",
			speed: 7.5,
			abilityBonuses: { dexterite: 2, charisme: 1 },
			languages: ["Commun", "Halfelin"],
			traits: [
				lucky,
				brave,
				halflingNimble,
				{
					name: "Discrétion naturelle",
					description:
						"Vous pouvez vous cacher derrière une créature plus grande que vous.",
				},
			],
		},
		3,
	),
	race(
		"halfelin-robuste",
		"Halfelin robuste",
		"Plus résistants, ils ont du sang nain dans les veines.",
		{
			size: "P",
			speed: 7.5,
			abilityBonuses: { dexterite: 2, constitution: 1 },
			languages: ["Commun", "Halfelin"],
			traits: [
				lucky,
				brave,
				halflingNimble,
				{
					name: "Robustesse halfeline",
					description:
						"Avantage contre le poison ; résistance aux dégâts de poison.",
				},
			],
		},
		4,
	),
	// — Humain —
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
		5,
	),
	// — Nain —
	race(
		"nain-collines",
		"Nain des collines",
		"Tenaces et sages, réputés pour leur endurance.",
		{
			size: "M",
			speed: 7.5,
			abilityBonuses: { constitution: 2, sagesse: 1 },
			languages: ["Commun", "Nain"],
			traits: [
				darkvision,
				dwarvenResilience,
				{
					name: "Entraînement nain au combat",
					description:
						"Maîtrise de la hache d'armes, de la hachette, du marteau léger et du marteau de guerre.",
				},
				{
					name: "Connaissance de la pierre",
					description:
						"Bonus de maîtrise doublé aux tests d'Histoire liés à la pierre.",
				},
				{
					name: "Ténacité naine",
					description: "+1 point de vie maximum par niveau.",
				},
			],
		},
		6,
	),
	race(
		"nain-montagnes",
		"Nain des montagnes",
		"Forts et endurcis, accoutumés à la vie en altitude.",
		{
			size: "M",
			speed: 7.5,
			abilityBonuses: { constitution: 2, force: 2 },
			languages: ["Commun", "Nain"],
			traits: [
				darkvision,
				dwarvenResilience,
				{
					name: "Entraînement nain au combat",
					description:
						"Maîtrise de la hache d'armes, de la hachette, du marteau léger et du marteau de guerre.",
				},
				{
					name: "Entraînement nain aux armures",
					description: "Maîtrise des armures légères et intermédiaires.",
				},
			],
		},
		7,
	),
	// — Demi-elfe —
	race(
		"demi-elfe",
		"Demi-elfe",
		"Entre deux mondes, charismatiques et adaptables.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { charisme: 2 },
			languages: ["Commun", "Elfique", "une langue au choix"],
			traits: [
				darkvision,
				feyAncestry,
				{
					name: "Polyvalence des caractéristiques",
					description:
						"+1 à deux caractéristiques de votre choix (autres que le Charisme).",
				},
				{
					name: "Polyvalence des compétences",
					description: "Maîtrise de deux compétences de votre choix.",
				},
			],
		},
		8,
	),
	// — Demi-orc —
	race(
		"demi-orc",
		"Demi-orc",
		"Puissants et endurants, redoutables au combat.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { force: 2, constitution: 1 },
			languages: ["Commun", "Orc"],
			skillProficiencies: ["intimidation"],
			traits: [
				darkvision,
				{
					name: "Endurance implacable",
					description:
						"Quand vous tombez à 0 PV sans être tué net, vous tombez à 1 PV (1×/repos long).",
				},
				{
					name: "Attaques sauvages",
					description:
						"Sur un coup critique au corps à corps, ajoutez un dé de dégâts de l'arme.",
				},
			],
		},
		9,
	),
	// — Gnome —
	race(
		"gnome-forets",
		"Gnome des forêts",
		"Petits, vifs et farceurs, doués pour l'illusion.",
		{
			size: "P",
			speed: 7.5,
			abilityBonuses: { intelligence: 2, dexterite: 1 },
			languages: ["Commun", "Gnome"],
			traits: [
				darkvision,
				gnomeCunning,
				{
					name: "Illusionniste-né",
					description:
						"Vous connaissez le tour de magie illusion mineure (Int).",
				},
				{
					name: "Communication avec les petits animaux",
					description: "Vous communiquez des idées simples aux petites bêtes.",
				},
			],
		},
		10,
	),
	race(
		"gnome-roches",
		"Gnome des roches",
		"Inventifs et bricoleurs, experts en mécanismes.",
		{
			size: "P",
			speed: 7.5,
			abilityBonuses: { intelligence: 2, constitution: 1 },
			languages: ["Commun", "Gnome"],
			traits: [
				darkvision,
				gnomeCunning,
				{
					name: "Savoir d'artificier",
					description:
						"Bonus de maîtrise doublé aux tests d'Histoire sur les objets magiques, alchimiques et technologiques.",
				},
				{
					name: "Bricoleur",
					description:
						"Maîtrise des outils de bricoleur ; vous fabriquez de petits dispositifs mécaniques.",
				},
			],
		},
		11,
	),
	// — Sangdragon —
	race(
		"sangdragon",
		"Sangdragon",
		"Fiers descendants des dragons, porteurs d'un souffle élémentaire.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { force: 2, charisme: 1 },
			languages: ["Commun", "Draconique"],
			traits: [
				{
					name: "Ascendance draconique",
					description:
						"Choisissez un type de dragon : il définit votre souffle et votre résistance.",
				},
				{
					name: "Souffle",
					description:
						"Action : exhalez une énergie élémentaire (jet de sauvegarde, dégâts croissants avec le niveau).",
				},
				{
					name: "Résistance draconique",
					description: "Résistance au type de dégâts de votre ascendance.",
				},
			],
		},
		12,
	),
	// — Tieffelin —
	race(
		"tieffelin",
		"Tieffelin",
		"Marqués par un héritage infernal, charismatiques et résistants au feu.",
		{
			size: "M",
			speed: 9,
			abilityBonuses: { charisme: 2, intelligence: 1 },
			languages: ["Commun", "Infernal"],
			traits: [
				darkvision,
				{
					name: "Résistance infernale",
					description: "Résistance aux dégâts de feu.",
				},
				{
					name: "Héritage infernal",
					description:
						"Tour de magie thaumaturgie, puis réprimande infernale et ténèbres selon le niveau (Cha).",
				},
			],
		},
		13,
	),
];
