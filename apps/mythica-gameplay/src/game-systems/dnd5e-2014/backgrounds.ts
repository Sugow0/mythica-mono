/**
 * Historiques (backgrounds) D&D 5e (2014) — sous-ensemble curé. Chaque historique
 * accorde des maîtrises de compétences, des langues/outils, un trait et de l'or.
 */

import type { BackgroundData, SystemContentSeed } from "./types";

const background = (
	slug: string,
	name: string,
	description: string,
	data: BackgroundData,
	sortOrder: number,
): SystemContentSeed => ({
	collectionKey: "background",
	slug,
	name,
	description,
	sortOrder,
	data: data as unknown as Record<string, unknown>,
});

export const DND5E_BACKGROUNDS: SystemContentSeed[] = [
	background(
		"acolyte",
		"Acolyte",
		"Vous avez servi un temple, intermédiaire entre les mortels et le divin.",
		{
			skillProficiencies: ["intuition", "religion"],
			toolProficiencies: [],
			languages: 2,
			feature: {
				name: "Abri du fidèle",
				description:
					"Vous et vos compagnons recevez soins et accueil dans les temples de votre foi.",
			},
			startingGold: 15,
			startingEquipment: ["symbole-sacre", "baton"],
		},
		0,
	),
	background(
		"criminel",
		"Criminel",
		"Vous avez enfreint la loi et survécu dans l'ombre de la pègre.",
		{
			skillProficiencies: ["discretion", "tromperie"],
			toolProficiencies: ["outils-de-voleur"],
			languages: 0,
			feature: {
				name: "Contact criminel",
				description:
					"Vous disposez d'un contact fiable dans le milieu, relais vers d'autres criminels.",
			},
			startingGold: 15,
			startingEquipment: ["outils-de-voleur"],
		},
		1,
	),
	background(
		"sage",
		"Sage",
		"Des années d'étude ont fait de vous une référence dans votre domaine.",
		{
			skillProficiencies: ["arcanes", "histoire"],
			toolProficiencies: [],
			languages: 2,
			feature: {
				name: "Chercheur",
				description:
					"Vous savez où trouver une information ou qui pourrait la connaître.",
			},
			startingGold: 10,
			startingEquipment: ["grimoire"],
		},
		2,
	),
	background(
		"soldat",
		"Soldat",
		"Vous avez servi dans une armée et connu la discipline du champ de bataille.",
		{
			skillProficiencies: ["athletisme", "intimidation"],
			toolProficiencies: [],
			languages: 0,
			feature: {
				name: "Grade militaire",
				description:
					"Votre ancien grade vous vaut respect et accès auprès des soldats alliés.",
			},
			startingGold: 10,
			startingEquipment: ["insigne-de-grade"],
		},
		3,
	),
];
