/**
 * Sous-classes D&D 5e (2014) — collection "sous-classe". Chaque entrée référence
 * sa classe parente (`parentClass`), le niveau d'obtention (`acquisitionLevel`)
 * et ses aptitudes par niveau (`features`). Couvre les 12 classes du PHB
 * (40 sous-classes). Les tiers-lanceurs (chevalier occulte, escroc arcanique)
 * portent leur propre `spellcasting`.
 */

import { THIRD_CASTER } from "./spell-progression";
import type { SubclassData, SystemContentSeed } from "./types";

/** Les 18 compétences (clés) — pour les sous-classes accordant un choix libre. */
const ALL_SKILLS = [
	"acrobaties",
	"arcanes",
	"athletisme",
	"discretion",
	"dressage",
	"escamotage",
	"histoire",
	"intimidation",
	"intuition",
	"investigation",
	"medecine",
	"nature",
	"perception",
	"persuasion",
	"religion",
	"representation",
	"survie",
	"tromperie",
];

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
			expertise: {
				count: 2,
				from: ["arcanes", "histoire", "nature", "religion"],
			},
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

	// — Barbare : voies primitives (niveau 3) —
	subclass(
		"voie-du-berserker",
		"Voie du Berserker",
		"La rage à l'état pur, jusqu'à la frénésie.",
		{
			parentClass: "barbare",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Frénésie",
					description:
						"En rage, vous pouvez attaquer en action bonus à chaque tour (fatigue à la fin de la rage).",
				},
				{
					level: 6,
					name: "Rage inébranlable",
					description: "En rage, vous ne pouvez être ni charmé ni effrayé.",
				},
				{
					level: 10,
					name: "Présence intimidante",
					description: "Action : effrayez une créature par votre férocité.",
				},
				{
					level: 14,
					name: "Représailles",
					description:
						"Réaction quand une créature proche vous blesse : effectuez une attaque de mêlée.",
				},
			],
		},
		13,
	),
	subclass(
		"voie-du-guerrier-totem",
		"Voie du Guerrier totem",
		"Un lien spirituel avec un animal totem.",
		{
			parentClass: "barbare",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Esprit totem",
					description:
						"Vous choisissez un animal totem (ours, aigle, loup…) octroyant un bienfait en rage.",
				},
				{
					level: 6,
					name: "Aspect de la bête",
					description: "Vous gagnez un don permanent lié à un animal totem.",
				},
				{
					level: 10,
					name: "Marcheur spirituel",
					description: "Vous lancez rituellement communion avec la nature.",
				},
				{
					level: 14,
					name: "Harmonie totémique",
					description:
						"Un nouveau bienfait totémique s'active pendant votre rage.",
				},
			],
		},
		14,
	),

	// — Barde : collèges (niveau 3) —
	subclass(
		"college-du-savoir",
		"Collège du Savoir",
		"Le savoir comme arme et comme bouclier.",
		{
			parentClass: "barde",
			acquisitionLevel: 3,
			skillChoices: { count: 3, from: ALL_SKILLS },
			features: [
				{
					level: 3,
					name: "Maîtrises bonus",
					description: "Maîtrise de trois compétences au choix.",
				},
				{
					level: 3,
					name: "Mots cuisants",
					description:
						"Réaction : dépensez une Inspiration bardique pour réduire un jet ennemi.",
				},
				{
					level: 6,
					name: "Secrets magiques supplémentaires",
					description: "Vous apprenez deux sorts de n'importe quelle classe.",
				},
				{
					level: 14,
					name: "Aptitude sans pareille",
					description:
						"Vous ajoutez un dé d'Inspiration à tout test de caractéristique raté.",
				},
			],
		},
		15,
	),
	subclass(
		"college-de-la-vaillance",
		"Collège de la Vaillance",
		"Le barde guerrier qui inspire au combat.",
		{
			parentClass: "barde",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Maîtrises bonus",
					description:
						"Maîtrise des armures intermédiaires, des boucliers et des armes de guerre.",
				},
				{
					level: 3,
					name: "Inspiration de bravoure",
					description:
						"L'Inspiration bardique peut être dépensée pour ajouter un dé à un jet d'attaque ou à la CA.",
				},
				{
					level: 6,
					name: "Attaque supplémentaire",
					description:
						"Vous attaquez deux fois quand vous entreprenez l'action d'Attaque.",
				},
				{
					level: 14,
					name: "Magie de bataille",
					description:
						"Après un sort, vous pouvez faire une attaque d'arme en action bonus.",
				},
			],
		},
		16,
	),

	// — Druide : cercles (niveau 2) —
	subclass(
		"cercle-de-la-terre",
		"Cercle de la Terre",
		"Les gardiens du savoir druidique et des sorts du territoire.",
		{
			parentClass: "druide",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Tour de magie bonus",
					description:
						"Vous apprenez un tour de magie de druide supplémentaire.",
				},
				{
					level: 2,
					name: "Récupération naturelle",
					description:
						"Lors d'un repos court, vous récupérez des emplacements de sorts.",
				},
				{
					level: 3,
					name: "Sorts de cercle",
					description:
						"Selon votre terrain de prédilection, vous apprenez des sorts toujours préparés.",
				},
				{
					level: 6,
					name: "Foulée légère",
					description:
						"Vous ne laissez pas de traces et ignorez le terrain difficile naturel.",
				},
				{
					level: 10,
					name: "Halte des éléments naturels",
					description:
						"Vous êtes immunisé contre la pétrification et certains effets élémentaires.",
				},
				{
					level: 14,
					name: "Sanctuaire de la nature",
					description: "Les bêtes et les plantes hésitent à vous attaquer.",
				},
			],
		},
		17,
	),
	subclass(
		"cercle-de-la-lune",
		"Cercle de la Lune",
		"Les druides farouches, maîtres de la forme sauvage.",
		{
			parentClass: "druide",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Forme sauvage de combat",
					description:
						"Vous vous transformez en action bonus en bêtes plus puissantes (FP supérieur).",
				},
				{
					level: 6,
					name: "Frappes primitives",
					description: "Vos attaques en forme sauvage comptent comme magiques.",
				},
				{
					level: 10,
					name: "Forme élémentaire",
					description: "Vous pouvez vous transformer en élémentaire.",
				},
				{
					level: 14,
					name: "Mille formes",
					description: "Vous lancez métamorphose à volonté sur vous-même.",
				},
			],
		},
		18,
	),

	// — Ensorceleur : origines (niveau 1) —
	subclass(
		"lignee-draconique",
		"Lignée draconique",
		"Le sang d'un dragon coule dans vos veines.",
		{
			parentClass: "ensorceleur",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Ascendance draconique",
					description:
						"Vous choisissez un type de dragon (et un type de dégâts associé).",
				},
				{
					level: 1,
					name: "Résistance draconique",
					description:
						"Vos PV maximum augmentent et votre CA de base vaut 13 + mod. Dex sans armure.",
				},
				{
					level: 6,
					name: "Affinité élémentaire",
					description:
						"Ajoutez votre mod. de Charisme aux dégâts du type de votre dragon.",
				},
				{
					level: 14,
					name: "Ailes de dragon",
					description:
						"Action bonus : faites pousser des ailes et gagnez une vitesse de vol.",
				},
				{
					level: 18,
					name: "Présence draconique",
					description:
						"Action : aura de terreur ou de fascination autour de vous.",
				},
			],
		},
		19,
	),
	subclass(
		"magie-sauvage",
		"Magie sauvage",
		"Une magie chaotique et imprévisible.",
		{
			parentClass: "ensorceleur",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Vagues de magie sauvage",
					description:
						"Vos sorts peuvent déclencher une surtension d'effets aléatoires.",
				},
				{
					level: 1,
					name: "Marée chanceuse",
					description:
						"Vous relancez un jet d'attaque, de caractéristique ou de sauvegarde (charges = mod. Cha).",
				},
				{
					level: 6,
					name: "Flux de chaos",
					description:
						"Quand vous lancez un sort, vous pouvez provoquer une surtension et regagner un point de sorcellerie.",
				},
				{
					level: 14,
					name: "Courbure de la chance",
					description: "Réaction : modifiez un jet d'une créature proche.",
				},
				{
					level: 18,
					name: "Contrôle du chaos",
					description:
						"Quand vous déclenchez la magie sauvage, vous lancez deux fois et choisissez.",
				},
			],
		},
		20,
	),

	// — Magicien : traditions arcaniques (niveau 2) —
	subclass(
		"abjuration",
		"École d'Abjuration",
		"La magie protectrice et la négation des sorts.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en abjuration",
					description:
						"Copier des sorts d'abjuration dans votre grimoire coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Protection arcanique",
					description:
						"Vous créez un bouclier d'absorption qui encaisse des dégâts.",
				},
				{
					level: 6,
					name: "Projection de protection",
					description:
						"Votre bouclier d'absorption peut protéger une autre créature.",
				},
				{
					level: 10,
					name: "Résistance à la magie améliorée",
					description: "Avantage aux jets de sauvegarde contre les sorts.",
				},
				{
					level: 14,
					name: "Imperméabilité aux sorts",
					description:
						"Résistance aux dégâts des sorts et avantage permanent aux sauvegardes contre les sorts.",
				},
			],
		},
		21,
	),
	subclass(
		"invocation",
		"École d'Invocation",
		"L'art d'invoquer créatures et objets.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en invocation",
					description: "Copier des sorts d'invocation coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Invocation mineure",
					description:
						"Action : faites apparaître un objet inanimé de votre choix.",
				},
				{
					level: 6,
					name: "Déplacement bénéfique",
					description: "Vous vous téléportez sur une courte distance.",
				},
				{
					level: 10,
					name: "Invocateur concentré",
					description:
						"Votre concentration sur les sorts d'invocation ne peut être rompue par les dégâts.",
				},
				{
					level: 14,
					name: "Invocation durable",
					description:
						"Vos créatures invoquées résistent à la dissipation et aux dégâts.",
				},
			],
		},
		22,
	),
	subclass(
		"divination",
		"École de Divination",
		"La perception du passé, du présent et du futur.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en divination",
					description: "Copier des sorts de divination coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Présage",
					description:
						"Après un repos long, vous jetez deux d20 conservés pour remplacer des jets.",
				},
				{
					level: 6,
					name: "Expert du savoir",
					description:
						"Vous lancez divination et contact avec un autre plan sans risque.",
				},
				{
					level: 10,
					name: "Le troisième œil",
					description:
						"Action : gagnez vision dans le noir, lecture des langues ou vision aveugle.",
				},
				{
					level: 14,
					name: "Présage suprême",
					description: "Vous disposez de trois dés de Présage.",
				},
			],
		},
		23,
	),
	subclass(
		"enchantement",
		"École d'Enchantement",
		"La domination des esprits et des volontés.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en enchantement",
					description: "Copier des sorts d'enchantement coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Hypnotisme amélioré",
					description:
						"Vous charmez une créature supplémentaire avec certains sorts.",
				},
				{
					level: 6,
					name: "Détournement d'envoûtement",
					description:
						"Réaction : redirigez une attaque de mêlée sur une autre créature charmée.",
				},
				{
					level: 10,
					name: "Maître hypnotiseur",
					description:
						"Action : charmez une créature pour la commander brièvement.",
				},
				{
					level: 14,
					name: "Altération de la mémoire",
					description: "Vous effacez le souvenir d'avoir été charmé.",
				},
			],
		},
		24,
	),
	subclass(
		"evocation",
		"École d'Évocation",
		"Le déchaînement des énergies destructrices.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en évocation",
					description: "Copier des sorts d'évocation coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Sculpteur de sorts",
					description:
						"Vous épargnez des créatures de la zone de vos sorts d'évocation.",
				},
				{
					level: 6,
					name: "Tour de magie puissant",
					description:
						"Vos tours de magie infligent la moitié des dégâts même en cas d'échec du sort.",
				},
				{
					level: 10,
					name: "Évocation surpuissante",
					description:
						"Vous maximisez un dé de dégâts de vos sorts d'évocation.",
				},
				{
					level: 14,
					name: "Surcharge",
					description:
						"Vous surchargez un sort d'évocation pour des dégâts accrus.",
				},
			],
		},
		25,
	),
	subclass(
		"illusion",
		"École d'Illusion",
		"L'art de tromper les sens et l'esprit.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en illusion",
					description: "Copier des sorts d'illusion coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Illusion améliorée",
					description:
						"Votre tour de magie illusion mineure crée à la fois un son et une image.",
				},
				{
					level: 6,
					name: "Illusionniste accompli",
					description:
						"Vos illusions peuvent contenir un léger mouvement ou changement.",
				},
				{
					level: 10,
					name: "Illusions ancrées",
					description:
						"Vos illusions persistent sans concentration et résistent à l'examen.",
				},
				{
					level: 14,
					name: "Réalité illusoire",
					description: "Vous rendez réel un objet illusoire pendant un round.",
				},
			],
		},
		26,
	),
	subclass(
		"necromancie",
		"École de Nécromancie",
		"La manipulation de la vie et de la mort.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en nécromancie",
					description: "Copier des sorts de nécromancie coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Récolte morbide",
					description:
						"Quand vous tuez une créature avec un sort, vous regagnez des PV.",
				},
				{
					level: 6,
					name: "Maître des morts-vivants",
					description:
						"Vos morts-vivants animés sont plus résistants et plus puissants.",
				},
				{
					level: 10,
					name: "Siphon d'âmes",
					description:
						"Vos sorts de nécromancie vous octroient des PV temporaires.",
				},
				{
					level: 14,
					name: "Empire des morts-vivants",
					description:
						"Vous asservissez durablement un mort-vivant intelligent.",
				},
			],
		},
		27,
	),
	subclass(
		"transmutation",
		"École de Transmutation",
		"La transformation de la matière et de l'énergie.",
		{
			parentClass: "magicien",
			acquisitionLevel: 2,
			features: [
				{
					level: 2,
					name: "Économe en transmutation",
					description:
						"Copier des sorts de transmutation coûte deux fois moins.",
				},
				{
					level: 2,
					name: "Transmutation mineure",
					description:
						"Vous modifiez les propriétés physiques mineures d'un objet.",
				},
				{
					level: 6,
					name: "Alchimiste",
					description: "Vous lancez certains sorts de soins et de réparation.",
				},
				{
					level: 10,
					name: "Pierre du transmutateur",
					description:
						"Vous créez une pierre conférant un bienfait à son porteur.",
				},
				{
					level: 14,
					name: "Maître des transformations",
					description:
						"Votre pierre peut vous rajeunir et octroie davantage de bienfaits.",
				},
			],
		},
		28,
	),

	// — Moine : traditions monastiques (niveau 3) —
	subclass(
		"voie-de-la-main-ouverte",
		"Voie de la Main ouverte",
		"La maîtrise ultime du combat à mains nues.",
		{
			parentClass: "moine",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Technique de la main ouverte",
					description:
						"Votre Déluge de coups peut faire chuter, repousser ou empêcher les réactions.",
				},
				{
					level: 6,
					name: "Quiétude",
					description:
						"Vous dépensez du ki pour vous soigner d'une partie de vos PV.",
				},
				{
					level: 11,
					name: "Tranquillité",
					description:
						"Après un repos long, vous bénéficiez d'un effet de sanctuaire.",
				},
				{
					level: 17,
					name: "Vibration mortelle",
					description:
						"Vous infligez des vibrations létales différées à une créature touchée.",
				},
			],
		},
		29,
	),
	subclass(
		"voie-de-l-ombre",
		"Voie de l'Ombre",
		"Des moines furtifs maniant la magie des ténèbres.",
		{
			parentClass: "moine",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Arts de l'ombre",
					description:
						"Vous dépensez du ki pour lancer nappe de brouillard, ténèbres, passage sans trace…",
				},
				{
					level: 6,
					name: "Pas de l'ombre",
					description:
						"Depuis l'obscurité, vous vous téléportez d'un point d'ombre à un autre.",
				},
				{
					level: 11,
					name: "Manteau d'ombres",
					description: "Dans le noir, vous devenez invisible.",
				},
				{
					level: 17,
					name: "Opportuniste",
					description:
						"Réaction : attaquez une créature touchée par une autre que vous.",
				},
			],
		},
		30,
	),
	subclass(
		"voie-des-quatre-elements",
		"Voie des Quatre Éléments",
		"Le moine élémentaliste qui canalise le ki en magie.",
		{
			parentClass: "moine",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Disciple des éléments",
					description:
						"Vous apprenez des disciplines élémentaires produisant des effets magiques en dépensant du ki.",
				},
				{
					level: 6,
					name: "Discipline supplémentaire",
					description: "Vous apprenez une nouvelle discipline élémentaire.",
				},
				{
					level: 11,
					name: "Discipline supérieure",
					description: "Vous accédez à des disciplines plus puissantes.",
				},
				{
					level: 17,
					name: "Maîtrise élémentaire",
					description: "Vous maîtrisez les disciplines les plus puissantes.",
				},
			],
		},
		31,
	),

	// — Paladin : serments sacrés (niveau 3) —
	subclass(
		"serment-de-devotion",
		"Serment de Dévotion",
		"L'idéal du chevalier sans peur et sans reproche.",
		{
			parentClass: "paladin",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Conduit divin",
					description:
						"Arme sacrée (bonus aux attaques) et Renvoi de l'infidèle (fait fuir morts-vivants et fiélons).",
				},
				{
					level: 7,
					name: "Aura de dévotion",
					description: "Vous et vos alliés proches ne pouvez être charmés.",
				},
				{
					level: 15,
					name: "Pureté de l'âme",
					description: "Vous êtes immunisé contre la maladie et les poisons.",
				},
				{
					level: 20,
					name: "Champion sacré",
					description:
						"Action : aura de lumière sacrée renforçant vos attaques et vos soins.",
				},
			],
		},
		32,
	),
	subclass(
		"serment-des-anciens",
		"Serment des Anciens",
		"Le gardien de la lumière et de la vie face aux ténèbres.",
		{
			parentClass: "paladin",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Conduit divin",
					description:
						"Courroux de la nature (entraves spectrales) et Renvoi des infidèles.",
				},
				{
					level: 7,
					name: "Aura de garde",
					description:
						"Vous et vos alliés proches résistez aux dégâts des sorts.",
				},
				{
					level: 15,
					name: "Endurance indomptable",
					description:
						"Vous transformez un jet de d20 raté en 10 (1×/repos long).",
				},
				{
					level: 20,
					name: "Champion des Anciens",
					description:
						"Action : forme féerique octroyant régénération et résistances.",
				},
			],
		},
		33,
	),
	subclass(
		"serment-de-vengeance",
		"Serment de Vengeance",
		"La poursuite implacable des malfaiteurs.",
		{
			parentClass: "paladin",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Conduit divin",
					description:
						"Réprimande de l'assermenté (désigne un ennemi) et Renvoi des indignes.",
				},
				{
					level: 7,
					name: "Vengeur implacable",
					description:
						"Réaction quand une créature proche se déplace : suivez-la.",
				},
				{
					level: 15,
					name: "Âme de vengeance",
					description:
						"Vous attaquez une créature marquée par votre Réprimande en réaction.",
				},
				{
					level: 20,
					name: "Ange vengeur",
					description:
						"Action : ailes et aura d'effroi pour traquer vos ennemis.",
				},
			],
		},
		34,
	),

	// — Rôdeur : archétypes (niveau 3) —
	subclass(
		"chasseur",
		"Chasseur",
		"Le traqueur spécialisé contre les grandes menaces.",
		{
			parentClass: "rodeur",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Proie du chasseur",
					description:
						"Choix d'une aptitude offensive (Tueur de colosses, Briseur de hordes, Tueur de géants).",
				},
				{
					level: 7,
					name: "Tactique de défense",
					description: "Choix d'une aptitude défensive contre les attaques.",
				},
				{
					level: 11,
					name: "Multiattaque",
					description:
						"Volée de flèches ou attaque tournoyante touchant plusieurs cibles.",
				},
				{
					level: 15,
					name: "Défense de chasseur supérieure",
					description: "Vous réduisez fortement certains dégâts subis.",
				},
			],
		},
		35,
	),
	subclass(
		"maitre-des-betes",
		"Maître des bêtes",
		"Le rôdeur et son compagnon animal lié.",
		{
			parentClass: "rodeur",
			acquisitionLevel: 3,
			features: [
				{
					level: 3,
					name: "Compagnon animal",
					description:
						"Une bête loyale combat à vos côtés et agit sur votre commande.",
				},
				{
					level: 7,
					name: "Camaraderie exceptionnelle",
					description:
						"Votre compagnon ajoute votre bonus de maîtrise à davantage de jets.",
				},
				{
					level: 11,
					name: "Fureur bestiale",
					description:
						"Votre compagnon effectue deux attaques quand vous le commandez.",
				},
				{
					level: 15,
					name: "Défense partagée",
					description:
						"Vous et votre compagnon esquivez ensemble certaines attaques.",
				},
			],
		},
		36,
	),

	// — Occultiste : patrons d'outre-monde (niveau 1) —
	subclass(
		"patron-archifee",
		"Patron : l'Archifée",
		"Un pacte avec une puissance féerique capricieuse.",
		{
			parentClass: "sorcier",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Présence féerique",
					description: "Action : charmez ou effrayez les créatures proches.",
				},
				{
					level: 6,
					name: "Retraite enchantée",
					description:
						"Vous vous rendez invisible ou vous téléportez en réaction quand on vous touche.",
				},
				{
					level: 10,
					name: "Âme protégée",
					description: "Avantage pour échapper aux états charmé et effrayé.",
				},
				{
					level: 14,
					name: "Toquade",
					description:
						"Vous charmez totalement une créature pour une courte durée.",
				},
			],
		},
		37,
	),
	subclass(
		"patron-fielon",
		"Patron : le Fiélon",
		"Un pacte avec une entité des plans infernaux.",
		{
			parentClass: "sorcier",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Don sombre",
					description:
						"Quand vous réduisez une créature à 0 PV, vous gagnez des PV temporaires.",
				},
				{
					level: 6,
					name: "Bénédiction du sombre patron",
					description:
						"Vous relancez un jet de sauvegarde raté (charges = mod. Cha).",
				},
				{
					level: 10,
					name: "Résilience fiélonne",
					description:
						"Vous gagnez une résistance au type de dégâts de votre choix après un repos.",
				},
				{
					level: 14,
					name: "Expiation",
					description:
						"Vous envoyez une créature dans un autre plan brièvement (jet de sauvegarde).",
				},
			],
		},
		38,
	),
	subclass(
		"patron-grand-ancien",
		"Patron : le Grand Ancien",
		"Un pacte avec une entité cosmique insondable.",
		{
			parentClass: "sorcier",
			acquisitionLevel: 1,
			features: [
				{
					level: 1,
					name: "Esprit télépathique",
					description:
						"Vous communiquez télépathiquement avec les créatures proches.",
				},
				{
					level: 6,
					name: "Esclave malgré lui",
					description:
						"Réaction : réfléchissez un effet de charme ou d'effroi sur son lanceur.",
				},
				{
					level: 10,
					name: "Carapace psychique",
					description:
						"Vous résistez aux dégâts psychiques et ne subissez pas de coup critique psychique.",
				},
				{
					level: 14,
					name: "Asservissement",
					description:
						"Action : asservissez durablement une créature par un lien psychique.",
				},
			],
		},
		39,
	),
];
