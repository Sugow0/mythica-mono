/**
 * Sous-classes D&D 5e (2014) — collection "sous-classe". Chaque entrée référence
 * sa classe parente (`parentClass`), le niveau d'obtention (`acquisitionLevel`)
 * et ses aptitudes par niveau (`features`). Ajoutées par lots, classe par classe.
 *
 * Lot 1 : Clerc (domaines divins, obtenus au niveau 1).
 */

import { THIRD_CASTER } from "./spell-progression";
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

	// — Guerrier : archétypes martiaux (niveau 3) —
	subclass(
		"champion",
		"Champion",
		"La maîtrise martiale brute : des coups plus précis et plus mortels.",
		{
			parentClass: "guerrier",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Critique amélioré",
					description:
						"Vos attaques d'arme infligent un coup critique sur un 19 ou 20.",
				},
				{
					level: 7,
					name: "Athlète remarquable",
					description:
						"Demi bonus de maîtrise aux tests de For/Dex/Con non maîtrisés ; course d'élan allongée.",
				},
				{
					level: 10,
					name: "Style de combat supplémentaire",
					description: "Vous adoptez un second style de combat.",
				},
				{
					level: 15,
					name: "Critique supérieur",
					description:
						"Vos attaques d'arme infligent un coup critique sur un 18 à 20.",
				},
				{
					level: 18,
					name: "Survivant",
					description:
						"Au début de votre tour, regagnez des PV si vous êtes à la moitié ou moins.",
				},
			],
		},
		7,
	),
	subclass(
		"maitre-de-guerre",
		"Maître de guerre",
		"Un tacticien qui manie des manœuvres de combat précises.",
		{
			parentClass: "guerrier",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Manœuvres de combat",
					description:
						"Vous apprenez 3 manœuvres et disposez de 4 dés de supériorité (d8).",
				},
				{
					level: 3,
					name: "Étudiant de la guerre",
					description: "Maîtrise d'un type d'outils d'artisan.",
				},
				{
					level: 7,
					name: "Connais ton ennemi",
					description:
						"En observant une créature, vous évaluez ses capacités relatives aux vôtres.",
				},
				{
					level: 10,
					name: "Dés de supériorité améliorés",
					description: "Vos dés de supériorité passent à d10.",
				},
				{
					level: 15,
					name: "Relance",
					description:
						"Quand vous lancez l'initiative sans dé de supériorité, vous en récupérez un.",
				},
				{
					level: 18,
					name: "Dés de supériorité (d12)",
					description: "Vos dés de supériorité passent à d12.",
				},
			],
		},
		8,
	),
	subclass(
		"chevalier-occulte",
		"Chevalier occulte",
		"Un guerrier qui mêle l'acier à la magie d'abjuration et d'évocation.",
		{
			parentClass: "guerrier",
			acquisitionLevel: 3,
			spellcasting: {
				kind: "third_known",
				ability: "intelligence",
				cantripsKnown: THIRD_CASTER.cantripsKnownEK,
				spellsKnown: THIRD_CASTER.spellsKnown,
				spellListClass: "magicien",
				schoolFilter: ["Abjuration", "Évocation"],
			},
			features: [
				{
					level: 3,
					name: "Incantation",
					description:
						"Vous lancez des sorts de magicien (abjuration et évocation), Intelligence comme caractéristique d'incantation.",
				},
				{
					level: 3,
					name: "Lien avec l'arme",
					description:
						"Vous liez magiquement jusqu'à deux armes : elles reviennent à l'appel et ne peuvent vous être arrachées.",
				},
				{
					level: 7,
					name: "Charge martiale",
					description:
						"Quand vous lancez un tour de magie, vous pouvez faire une attaque d'arme en action bonus.",
				},
				{
					level: 10,
					name: "Maîtrise de la guerre magique",
					description:
						"Charge martiale fonctionne aussi avec les sorts d'incantation rapide.",
				},
				{
					level: 15,
					name: "Charge martiale améliorée",
					description:
						"Vous effectuez deux attaques d'arme au lieu d'une avec Charge martiale.",
				},
				{
					level: 18,
					name: "Transfert d'incantation",
					description:
						"Vous pouvez déplacer un sort de concentration sur une arme liée.",
				},
			],
		},
		9,
	),

	// — Roublard : archétypes (niveau 3) —
	subclass(
		"voleur",
		"Voleur",
		"L'archétype agile et opportuniste, expert des larcins.",
		{
			parentClass: "roublard",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Mains agiles",
					description:
						"Votre action bonus d'Astuce permet aussi d'Utiliser un objet.",
				},
				{
					level: 3,
					name: "Travail en hauteur",
					description:
						"Vitesse d'escalade ; vous sautez depuis une hauteur sans coût supplémentaire.",
				},
				{
					level: 9,
					name: "Discrétion suprême",
					description:
						"Avantage aux tests de Discrétion si vous bougez de la moitié de votre vitesse ou moins.",
				},
				{
					level: 13,
					name: "Usage d'objets magiques",
					description:
						"Vous ignorez les conditions de classe, race et niveau pour utiliser un objet magique.",
				},
				{
					level: 17,
					name: "Réflexes de voleur",
					description: "Vous jouez deux tours au premier round d'un combat.",
				},
			],
		},
		10,
	),
	subclass(
		"assassin",
		"Assassin",
		"Le maître du déguisement, du poison et de la mise à mort.",
		{
			parentClass: "roublard",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Maîtrises bonus",
					description:
						"Maîtrise du kit d'empoisonneur et du matériel de déguisement.",
				},
				{
					level: 3,
					name: "Assassinat",
					description:
						"Avantage contre les créatures n'ayant pas encore agi ; coup critique automatique sur une cible surprise.",
				},
				{
					level: 9,
					name: "Infiltration",
					description: "Vous créez une fausse identité crédible et durable.",
				},
				{
					level: 13,
					name: "Imposteur",
					description:
						"Vous imitez à la perfection le discours, l'écriture et le comportement d'autrui.",
				},
				{
					level: 17,
					name: "Coup fatal",
					description:
						"1×/tour, votre attaque sournoise contre une cible surprise inflige le double de dés.",
				},
			],
		},
		11,
	),
	subclass(
		"escroc-arcanique",
		"Escroc arcanique",
		"Un roublard mêlant la magie d'enchantement et d'illusion à ses larcins.",
		{
			parentClass: "roublard",
			acquisitionLevel: 3,
			spellcasting: {
				kind: "third_known",
				ability: "intelligence",
				cantripsKnown: THIRD_CASTER.cantripsKnownAT,
				spellsKnown: THIRD_CASTER.spellsKnown,
				spellListClass: "magicien",
				schoolFilter: ["Enchantement", "Illusion"],
			},
			features: [
				{
					level: 3,
					name: "Incantation",
					description:
						"Vous lancez des sorts de magicien (enchantement et illusion), Intelligence comme caractéristique d'incantation.",
				},
				{
					level: 3,
					name: "Magie d'esprit",
					description:
						"Vous connaissez main du mage et pouvez la lancer de façon invisible et discrète.",
				},
				{
					level: 9,
					name: "Embuscade magique",
					description:
						"Une créature ratant un jet contre votre sort est désavantagée si vous étiez caché.",
				},
				{
					level: 13,
					name: "Vol enchanté",
					description:
						"Action : utilisez main du mage pour escamoter un objet à distance.",
				},
				{
					level: 17,
					name: "Voleur de sorts",
					description:
						"Réaction : tentez de voler le savoir d'un sort lancé sur vous.",
				},
			],
		},
		12,
	),
];
