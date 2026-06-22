/**
 * Catalogue des propriétés de fiche D&D 5e (édition 2014) seedées dans
 * `character_sheet_properties`.
 *
 * Ce catalogue est **indépendant d'un système** : il décrit les propriétés
 * réutilisables d'une fiche. Le mapping système ↔ propriété
 * (`game_system_properties`, formules dérivées comprises) est traité ailleurs
 * (FEAT-160) et n'entre pas dans le périmètre de ce fichier.
 *
 * La `key` (unique) est la clé naturelle : le seed est idempotent par `key` et
 * l'`id` (UUID v7) est généré à la création, jamais codé en dur. Les clés
 * réutilisent celles des constantes front (`dnd5e.ts`) pour garder une
 * cohérence inter-services.
 */

/** Valeurs autorisées pour `type`, alignées sur l'enum Prisma `PropertyType`. */
export type PropertyType =
	| "text"
	| "number"
	| "boolean"
	| "select"
	| "multiselect"
	| "textarea"
	| "resource"
	| "list"
	| "derived";

export type CharacterSheetPropertyData = {
	key: string;
	label: string;
	type: PropertyType;
	defaultValue?: string;
	options?: Record<string, unknown>;
	description?: string;
};

/** Les 6 caractéristiques de base (number, score par défaut 10). */
const ABILITIES: CharacterSheetPropertyData[] = [
	{
		key: "force",
		label: "Force",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Force.",
	},
	{
		key: "dexterite",
		label: "Dextérité",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Dextérité.",
	},
	{
		key: "constitution",
		label: "Constitution",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Constitution.",
	},
	{
		key: "intelligence",
		label: "Intelligence",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique d'Intelligence.",
	},
	{
		key: "sagesse",
		label: "Sagesse",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Sagesse.",
	},
	{
		key: "charisme",
		label: "Charisme",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Charisme.",
	},
];

/** Statistiques de combat / progression (number). */
const STATS: CharacterSheetPropertyData[] = [
	{
		key: "niveau",
		label: "Niveau",
		type: "number",
		defaultValue: "1",
		description: "Niveau du personnage.",
	},
	{
		key: "ca",
		label: "Classe d'armure",
		type: "number",
		defaultValue: "10",
		description: "Classe d'armure (CA).",
	},
	{
		key: "vitesse",
		label: "Vitesse",
		type: "number",
		defaultValue: "9",
		description: "Vitesse de déplacement, en mètres.",
	},
];

/** Ressources consommables / régénérables (PV, dés de vie, emplacements). */
const RESOURCES: CharacterSheetPropertyData[] = [
	{
		key: "hp",
		label: "Points de vie",
		type: "resource",
		description: "Points de vie (courants / maximum / temporaires).",
	},
	{
		key: "des_de_vie",
		label: "Dés de vie",
		type: "resource",
		description: "Dés de vie disponibles pour récupérer des PV.",
	},
	...Array.from({ length: 9 }, (_, i) => {
		const level = i + 1;
		return {
			key: `spell_slots_${level}`,
			label: `Emplacements de sorts (niveau ${level})`,
			type: "resource" as const,
			description: `Emplacements de sorts de niveau ${level}.`,
		};
	}),
];

/** Les 18 compétences = maîtrise (boolean). */
const SKILLS: CharacterSheetPropertyData[] = [
	{ key: "acrobaties", label: "Acrobaties" },
	{ key: "arcanes", label: "Arcanes" },
	{ key: "athletisme", label: "Athlétisme" },
	{ key: "discretion", label: "Discrétion" },
	{ key: "dressage", label: "Dressage" },
	{ key: "escamotage", label: "Escamotage" },
	{ key: "histoire", label: "Histoire" },
	{ key: "intimidation", label: "Intimidation" },
	{ key: "intuition", label: "Intuition" },
	{ key: "investigation", label: "Investigation" },
	{ key: "medecine", label: "Médecine" },
	{ key: "nature", label: "Nature" },
	{ key: "perception", label: "Perception" },
	{ key: "persuasion", label: "Persuasion" },
	{ key: "religion", label: "Religion" },
	{ key: "representation", label: "Représentation" },
	{ key: "survie", label: "Survie" },
	{ key: "tromperie", label: "Tromperie" },
].map((skill) => ({
	key: skill.key,
	label: skill.label,
	type: "boolean" as const,
	defaultValue: "false",
	description: `Maîtrise de la compétence ${skill.label}.`,
}));

/** Divers : inspiration (boolean) et initiative (dérivée). */
const MISC: CharacterSheetPropertyData[] = [
	{
		key: "inspiration",
		label: "Inspiration",
		type: "boolean",
		defaultValue: "false",
		description: "Inspiration héroïque (D&D 5e).",
	},
	{
		key: "initiative",
		label: "Initiative",
		type: "derived",
		description:
			"Valeur dérivée (modificateur de Dextérité). Formule définie par le mapping système (FEAT-160).",
	},
];

/** Champs de lore (texte libre) renseignés à la dernière étape de création. */
const LORE: CharacterSheetPropertyData[] = [
	{
		key: "apparence",
		label: "Apparence",
		type: "textarea",
		description: "Description physique du personnage (token, traits, allure).",
	},
	{
		key: "biographie",
		label: "Histoire",
		type: "textarea",
		description: "Passé et histoire personnelle du personnage.",
	},
	{
		key: "personnalite",
		label: "Traits de personnalité",
		type: "textarea",
		description: "Traits de caractère marquants du personnage.",
	},
	{
		key: "liens",
		label: "Liens",
		type: "textarea",
		description: "Relations et attaches du personnage.",
	},
	{
		key: "ideaux",
		label: "Idéaux",
		type: "textarea",
		description: "Principes et idéaux qui guident le personnage.",
	},
	{
		key: "defauts",
		label: "Défauts",
		type: "textarea",
		description: "Faiblesses et défauts du personnage.",
	},
];

/** Maîtrises des jets de sauvegarde (boolean), une par caractéristique. */
const SAVES: CharacterSheetPropertyData[] = [
	{ key: "force", label: "Force" },
	{ key: "dexterite", label: "Dextérité" },
	{ key: "constitution", label: "Constitution" },
	{ key: "intelligence", label: "Intelligence" },
	{ key: "sagesse", label: "Sagesse" },
	{ key: "charisme", label: "Charisme" },
].map((s) => ({
	key: `sauvegarde_${s.key}`,
	label: `Sauvegarde de ${s.label}`,
	type: "boolean" as const,
	defaultValue: "false",
	description: `Maîtrise du jet de sauvegarde de ${s.label}.`,
}));

/** Valeurs de combat dérivées et champs additionnels. */
const COMBAT_EXTRA: CharacterSheetPropertyData[] = [
	{
		key: "bonus_maitrise",
		label: "Bonus de maîtrise",
		type: "derived",
		description: "Bonus de maîtrise dérivé du niveau total.",
	},
	{
		key: "perception_passive",
		label: "Perception passive",
		type: "derived",
		description:
			"Sagesse (Perception) passive : 10 + modificateur (+ maîtrise).",
	},
	{
		key: "pv_temporaires",
		label: "Points de vie temporaires",
		type: "number",
		defaultValue: "0",
		description: "Points de vie temporaires courants.",
	},
	{
		key: "attaques",
		label: "Attaques",
		type: "list",
		description: "Attaques et sorts d'attaque (nom, bonus, dégâts/type).",
	},
	{
		key: "expertises",
		label: "Expertises",
		type: "list",
		description: "Compétences avec expertise (double bonus de maîtrise).",
	},
	{
		key: "ameliorations",
		label: "Améliorations de caractéristiques",
		type: "list",
		description:
			"Allocations d'amélioration de caractéristiques choisies aux paliers d'ASI.",
	},
];

/** Valeurs d'incantation dérivées (caractéristique selon la classe). */
const SPELL_DERIVED: CharacterSheetPropertyData[] = [
	{
		key: "dd_sorts",
		label: "DD des sorts",
		type: "derived",
		description: "Degré de difficulté des jets de sauvegarde contre vos sorts.",
	},
	{
		key: "bonus_attaque_sort",
		label: "Bonus d'attaque de sort",
		type: "derived",
		description: "Bonus aux jets d'attaque de sort.",
	},
];

/** Identité du personnage. */
const IDENTITY: CharacterSheetPropertyData[] = [
	{
		key: "alignement",
		label: "Alignement",
		type: "select",
		options: {
			values: [
				"Loyal Bon",
				"Neutre Bon",
				"Chaotique Bon",
				"Loyal Neutre",
				"Neutre",
				"Chaotique Neutre",
				"Loyal Mauvais",
				"Neutre Mauvais",
				"Chaotique Mauvais",
			],
		},
		description: "Alignement moral et éthique.",
	},
	{
		key: "experience",
		label: "Points d'expérience",
		type: "number",
		defaultValue: "0",
		description: "Points d'expérience accumulés.",
	},
];

/** Autres maîtrises et langues (texte libre, alimenté par race/classe/historique). */
const PROFICIENCIES: CharacterSheetPropertyData[] = [
	{
		key: "maitrises_langues",
		label: "Autres maîtrises et langues",
		type: "textarea",
		description: "Maîtrises d'outils, armes, armures et langues connues.",
	},
];

/** Monnaie (pièces) et trésor. */
const MONEY: CharacterSheetPropertyData[] = [
	{ key: "pieces_cuivre", label: "Pièces de cuivre (pc)" },
	{ key: "pieces_argent", label: "Pièces d'argent (pa)" },
	{ key: "pieces_electrum", label: "Pièces d'électrum (pe)" },
	{ key: "pieces_or", label: "Pièces d'or (po)" },
	{ key: "pieces_platine", label: "Pièces de platine (pp)" },
].map((c) => ({
	key: c.key,
	label: c.label,
	type: "number" as const,
	defaultValue: "0",
	description: `${c.label} possédées.`,
}));

/** Caractéristiques physiques et lore additionnel. */
const PHYSICAL: CharacterSheetPropertyData[] = [
	{ key: "age", label: "Âge" },
	{ key: "taille", label: "Taille" },
	{ key: "poids", label: "Poids" },
	{ key: "yeux", label: "Yeux" },
	{ key: "peau", label: "Peau" },
	{ key: "cheveux", label: "Cheveux" },
].map((p) => ({
	key: p.key,
	label: p.label,
	type: "text" as const,
	description: `${p.label} du personnage.`,
}));

/** Lore additionnel de la fiche officielle. */
const LORE_EXTRA: CharacterSheetPropertyData[] = [
	{
		key: "allies_organisations",
		label: "Alliés et organisations",
		type: "textarea",
		description: "Alliés, factions et organisations liés au personnage.",
	},
	{
		key: "capacites_traits",
		label: "Capacités et traits",
		type: "textarea",
		description: "Aptitudes de race, classe et historique.",
	},
	{
		key: "tresor",
		label: "Trésor",
		type: "textarea",
		description: "Objets de valeur et trésors notables.",
	},
];

/**
 * Catalogue complet des propriétés de fiche D&D 5e, données pures et stables.
 * L'idempotence du seed repose sur la `key` (unique) ; aucun `id` n'est codé en
 * dur — il est généré en UUID v7 à l'insertion.
 */
export const DND5E_CHARACTER_SHEET_PROPERTIES: CharacterSheetPropertyData[] = [
	...ABILITIES,
	...STATS,
	...RESOURCES,
	...SKILLS,
	...MISC,
	...SAVES,
	...COMBAT_EXTRA,
	...SPELL_DERIVED,
	...IDENTITY,
	...PROFICIENCIES,
	...MONEY,
	...PHYSICAL,
	...LORE,
	...LORE_EXTRA,
];
