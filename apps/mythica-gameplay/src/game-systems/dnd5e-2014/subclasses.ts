/**
 * Sous-classes D&D 5e (2014) — collection "sous-classe". Chaque entrée référence
 * sa classe parente (`parentClass`), le niveau d'obtention (`acquisitionLevel`)
 * et ses aptitudes par niveau (`features`). Ajoutées par lots, classe par classe.
 *
 * Lot 1 : Clerc (domaines divins, obtenus au niveau 1).
 */

import type { SubclassData, SystemContentSeed } from "./types";

const subclass = (
	slug: string,
	name: string,
	description: string,
	data: SubclassData,
	sortOrder: number,
): SystemContentSeed => ({
	collectionKey: "sous-classe",
	slug,
	name,
	description,
	sortOrder,
	data: data as unknown as Record<string, unknown>,
});

export const DND5E_SUBCLASSES: SystemContentSeed[] = [
	// — Clerc : domaines divins (niveau 1) —
	subclass(
		"domaine-de-la-vie",
		"Domaine de la Vie",
		"La force vitale positive qui soigne et préserve.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Maîtrise des armures lourdes",
					description: "Vous gagnez la maîtrise des armures lourdes.",
				},
				{
					level: 1,
					name: "Disciple de la vie",
					description:
						"Vos sorts de soins rendent 2 + le niveau du sort de PV supplémentaires.",
				},
				{
					level: 2,
					name: "Conduit divin : Préservation de la vie",
					description:
						"Action : répartissez 5 × votre niveau de clerc PV entre des créatures (max moitié de leur total).",
				},
				{
					level: 6,
					name: "Guérisseur béni",
					description:
						"Quand vous soignez une créature, vous récupérez 2 + le niveau du sort de PV.",
				},
				{
					level: 8,
					name: "Frappe divine",
					description:
						"1×/tour, une attaque d'arme inflige +1d8 dégâts radiants (2d8 au niveau 14).",
				},
				{
					level: 17,
					name: "Guérison suprême",
					description:
						"Quand vous lanceriez un dé de soin, utilisez la valeur maximale.",
				},
			],
		},
		0,
	),
	subclass(
		"domaine-de-la-lumiere",
		"Domaine de la Lumière",
		"La lumière brûlante, la révélation et la protection.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Tour de magie bonus",
					description: "Vous connaissez le tour de magie lumière.",
				},
				{
					level: 1,
					name: "Flamboiement protecteur",
					description:
						"Réaction quand vous êtes attaqué : imposez un désavantage au jet d'attaque.",
				},
				{
					level: 2,
					name: "Conduit divin : Flamme radieuse",
					description:
						"Action : infligez des dégâts radiants en rayonnement dans un cercle de 9 m.",
				},
				{
					level: 6,
					name: "Flamboiement amélioré",
					description:
						"Vous pouvez utiliser Flamboiement protecteur pour protéger une autre créature.",
				},
				{
					level: 8,
					name: "Puissance d'incantation",
					description:
						"Ajoutez votre modificateur de Sagesse aux dégâts d'un tour de magie de clerc.",
				},
				{
					level: 17,
					name: "Couronne de lumière",
					description:
						"Action : aura de lumière de 18 m imposant un désavantage contre vos sorts de feu/radiant.",
				},
			],
		},
		1,
	),
	subclass(
		"domaine-de-la-guerre",
		"Domaine de la Guerre",
		"Le courage et la maîtrise des armes au service du divin.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Maîtrises bonus",
					description: "Maîtrise des armes de guerre et des armures lourdes.",
				},
				{
					level: 1,
					name: "Prêtre de guerre",
					description:
						"Quand vous lancez l'Attaque, vous pouvez attaquer en action bonus (Sag/repos).",
				},
				{
					level: 2,
					name: "Conduit divin : Faveur divine",
					description: "Action bonus : +10 à un jet d'attaque d'arme.",
				},
				{
					level: 6,
					name: "Bénédiction du dieu guerrier",
					description:
						"Réaction : +10 à un jet d'attaque allié (charges = mod. Sag).",
				},
				{
					level: 8,
					name: "Frappe divine",
					description:
						"1×/tour, une attaque d'arme inflige +1d8 dégâts (2d8 au niveau 14).",
				},
				{
					level: 17,
					name: "Avatar de la bataille",
					description:
						"Résistance aux dégâts contondants, perforants et tranchants non magiques.",
				},
			],
		},
		2,
	),
	subclass(
		"domaine-de-la-connaissance",
		"Domaine de la Connaissance",
		"La quête du savoir et des secrets du multivers.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Bénédictions du savoir",
					description:
						"Deux langues + maîtrise (et expertise) de deux compétences au choix (Arcanes, Histoire, Nature, Religion).",
				},
				{
					level: 2,
					name: "Conduit divin : Réprimande du savoir",
					description:
						"Action : lisez la pensée et le passé proche d'une créature.",
				},
				{
					level: 6,
					name: "Lecture des pensées",
					description:
						"Vous pouvez lire les pensées de surface des créatures proches.",
				},
				{
					level: 8,
					name: "Puissance d'incantation",
					description:
						"Ajoutez votre modificateur de Sagesse aux dégâts d'un tour de magie de clerc.",
				},
				{
					level: 17,
					name: "Vision du passé",
					description:
						"Vous pouvez percevoir l'histoire d'un objet ou d'un lieu par la méditation.",
				},
			],
		},
		3,
	),
	subclass(
		"domaine-de-la-duperie",
		"Domaine de la Duperie",
		"La ruse, l'illusion et la subversion.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Bénédiction du filou",
					description:
						"Action : conférez avantage aux jets de Dextérité (Discrétion) à une créature pendant 1 h.",
				},
				{
					level: 2,
					name: "Conduit divin : Invocation de la duplicité",
					description:
						"Action : créez une illusion de vous-même pour vous avantager.",
				},
				{
					level: 6,
					name: "Manteau de la duperie",
					description:
						"Action : devenez invisible jusqu'à la fin de votre prochain tour.",
				},
				{
					level: 8,
					name: "Frappe divine empoisonnée",
					description:
						"1×/tour, une attaque d'arme inflige +1d8 dégâts de poison (2d8 au niveau 14).",
				},
				{
					level: 17,
					name: "Double amélioré",
					description:
						"Invocation de la duplicité crée jusqu'à quatre doubles.",
				},
			],
		},
		4,
	),
	subclass(
		"domaine-de-la-nature",
		"Domaine de la Nature",
		"La puissance des dieux de la nature sauvage.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Acolyte de la nature",
					description:
						"Un tour de magie de druide + maîtrise d'une compétence (Dressage, Nature ou Survie) + armures lourdes.",
				},
				{
					level: 2,
					name: "Conduit divin : Charme des animaux et des plantes",
					description: "Action : charmez des bêtes et des plantes proches.",
				},
				{
					level: 6,
					name: "Aura de protection dévouée",
					description:
						"Réaction : conférez résistance aux dégâts à des alliés proches.",
				},
				{
					level: 8,
					name: "Frappe divine",
					description:
						"1×/tour, une attaque d'arme inflige +1d8 dégâts (élément au choix, 2d8 au niveau 14).",
				},
				{
					level: 17,
					name: "Maître de la nature",
					description:
						"Vous commandez verbalement les créatures charmées par votre Conduit divin.",
				},
			],
		},
		5,
	),
	subclass(
		"domaine-de-la-tempete",
		"Domaine de la Tempête",
		"La fureur de la foudre, du tonnerre et des flots.",
		{
			parentClass: "clerc",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Maîtrises bonus",
					description: "Maîtrise des armes de guerre et des armures lourdes.",
				},
				{
					level: 1,
					name: "Magie de la tempête",
					description:
						"Quand vous lancez un sort de foudre/tonnerre, déplacement vertical possible.",
				},
				{
					level: 2,
					name: "Conduit divin : Courroux de la tempête",
					description:
						"Réaction quand on vous touche : dégâts de foudre et désavantage au jet de sauvegarde.",
				},
				{
					level: 6,
					name: "Frappe du tonnerre",
					description:
						"Vos dégâts de foudre repoussent les créatures de grande taille ou moins.",
				},
				{
					level: 8,
					name: "Frappe divine",
					description:
						"1×/tour, une attaque d'arme inflige +1d8 dégâts de foudre (2d8 au niveau 14).",
				},
				{
					level: 17,
					name: "Naissance de la tempête",
					description:
						"Vous gagnez une vitesse de vol égale à votre vitesse au sol.",
				},
			],
		},
		6,
	),
];
