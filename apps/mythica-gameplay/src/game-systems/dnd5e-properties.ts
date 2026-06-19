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
	...LORE,
];
