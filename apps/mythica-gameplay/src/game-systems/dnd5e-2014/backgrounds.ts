/**
 * Historiques (backgrounds) D&D 5e (2014) — les 13 du PHB (chap. 4). Chacun
 * accorde 2 maîtrises de compétences, des outils/langues, un trait et de l'or.
 * Nomenclature FR du PHB.
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
			startingEquipment: ["amulette"],
		},
		0,
	),
	background(
		"artisan-de-guilde",
		"Artisan de guilde",
		"Membre d'une guilde, vous maîtrisez un métier reconnu.",
		{
			skillProficiencies: ["intuition", "persuasion"],
			toolProficiencies: ["un type d'outils d'artisan"],
			languages: 1,
			feature: {
				name: "Appartenance à une guilde",
				description:
					"Votre guilde vous offre soutien, hébergement et appuis dans les villes.",
			},
			startingGold: 15,
			startingEquipment: ["outils-de-forgeron"],
		},
		1,
	),
	background(
		"artiste",
		"Artiste",
		"Vous avez vécu de vos spectacles, sachant captiver une foule.",
		{
			skillProficiencies: ["acrobaties", "representation"],
			toolProficiencies: [
				"matériel de déguisement",
				"un instrument de musique",
			],
			languages: 0,
			feature: {
				name: "Demande populaire",
				description:
					"Vous trouvez toujours où vous produire, gîte et couvert en échange de représentations.",
			},
			startingGold: 15,
			startingEquipment: ["luth"],
		},
		2,
	),
	background(
		"charlatan",
		"Charlatan",
		"Beau parleur et filou, vous vivez d'arnaques et de faux-semblants.",
		{
			skillProficiencies: ["tromperie", "escamotage"],
			toolProficiencies: ["matériel de déguisement", "matériel de faussaire"],
			languages: 0,
			feature: {
				name: "Fausse identité",
				description:
					"Vous possédez une seconde identité crédible et savez contrefaire des documents.",
			},
			startingGold: 15,
			startingEquipment: ["kit-de-contrefacon"],
		},
		3,
	),
	background(
		"criminel",
		"Criminel",
		"Vous avez enfreint la loi et survécu dans l'ombre de la pègre.",
		{
			skillProficiencies: ["tromperie", "discretion"],
			toolProficiencies: ["un type de jeu", "outils-de-voleur"],
			languages: 0,
			feature: {
				name: "Contact criminel",
				description:
					"Vous disposez d'un contact fiable dans le milieu, relais vers d'autres criminels.",
			},
			startingGold: 15,
			startingEquipment: ["outils-de-voleur"],
		},
		4,
	),
	background(
		"ermite",
		"Ermite",
		"Vous avez vécu retiré du monde, en quête d'une vérité intérieure.",
		{
			skillProficiencies: ["medecine", "religion"],
			toolProficiencies: ["matériel d'herboriste"],
			languages: 1,
			feature: {
				name: "Découverte",
				description:
					"Votre réclusion vous a mené à une révélation unique, secrète et puissante.",
			},
			startingGold: 5,
			startingEquipment: ["kit-dherboriste"],
		},
		5,
	),
	background(
		"heros-du-peuple",
		"Héros du peuple",
		"Issu du commun, vous êtes devenu le champion des gens simples.",
		{
			skillProficiencies: ["dressage", "survie"],
			toolProficiencies: ["un type d'outils d'artisan", "véhicules terrestres"],
			languages: 0,
			feature: {
				name: "Hospitalité rustique",
				description:
					"Le petit peuple vous offre refuge et protection contre les autorités.",
			},
			startingGold: 10,
			startingEquipment: ["outils-de-forgeron"],
		},
		6,
	),
	background(
		"marin",
		"Marin",
		"Vous avez bourlingué sur les mers, aguerri aux tempêtes et aux ports.",
		{
			skillProficiencies: ["athletisme", "perception"],
			toolProficiencies: ["matériel de navigateur", "véhicules aquatiques"],
			languages: 0,
			feature: {
				name: "Passage de navire",
				description:
					"Vous pouvez négocier un passage gratuit pour vous et vos compagnons.",
			},
			startingGold: 10,
			startingEquipment: ["corde-en-chanvre"],
		},
		7,
	),
	background(
		"noble",
		"Noble",
		"Né dans le privilège, vous portez un nom et des manières de cour.",
		{
			skillProficiencies: ["histoire", "persuasion"],
			toolProficiencies: ["un type de jeu"],
			languages: 1,
			feature: {
				name: "Position privilégiée",
				description:
					"Votre rang vous ouvre les portes de la haute société et le respect du peuple.",
			},
			startingGold: 25,
			startingEquipment: ["chevaliere"],
		},
		8,
	),
	background(
		"orphelin",
		"Orphelin",
		"Enfant des rues, vous avez survécu par la ruse et la débrouille.",
		{
			skillProficiencies: ["escamotage", "discretion"],
			toolProficiencies: ["matériel de déguisement", "outils-de-voleur"],
			languages: 0,
			feature: {
				name: "Connaissance de la ville",
				description:
					"Vous vous déplacez deux fois plus vite en ville par des passages secrets.",
			},
			startingGold: 10,
			startingEquipment: ["outils-de-voleur"],
		},
		9,
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
		10,
	),
	background(
		"sauvageon",
		"Sauvageon",
		"Né loin de la civilisation, vous connaissez les terres sauvages.",
		{
			skillProficiencies: ["athletisme", "survie"],
			toolProficiencies: ["un instrument de musique"],
			languages: 1,
			feature: {
				name: "Errant",
				description:
					"Vous trouvez toujours nourriture et eau dans la nature, et gardez une mémoire infaillible des terres parcourues.",
			},
			startingGold: 10,
			startingEquipment: ["baton"],
		},
		11,
	),
	background(
		"soldat",
		"Soldat",
		"Vous avez servi dans une armée et connu la discipline du champ de bataille.",
		{
			skillProficiencies: ["athletisme", "intimidation"],
			toolProficiencies: ["un type de jeu", "véhicules terrestres"],
			languages: 0,
			feature: {
				name: "Grade militaire",
				description:
					"Votre ancien grade vous vaut respect et accès auprès des soldats alliés.",
			},
			startingGold: 10,
			startingEquipment: ["chevaliere"],
		},
		12,
	),
];
