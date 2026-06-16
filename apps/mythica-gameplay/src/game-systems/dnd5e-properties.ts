/**
 * Catalogue des propriétés de fiche D&D 5e (édition 2014) seedées dans
 * `character_sheet_properties`.
 *
 * Ce catalogue est **indépendant d'un système** : il décrit les propriétés
 * réutilisables d'une fiche. Le mapping système ↔ propriété
 * (`game_system_properties`, formules dérivées comprises) est traité ailleurs
 * (FEAT-160) et n'entre pas dans le périmètre de ce fichier.
 *
 * Les `id` sont des UUID **fixes** pour garantir l'idempotence du seed, et les
 * `key` réutilisent les clés des constantes front (`dnd5e.ts`) afin de garder
 * une cohérence inter-services.
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
	id: string;
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
		id: "b0000000-0000-4000-8000-000000000001",
		key: "force",
		label: "Force",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Force.",
	},
	{
		id: "b0000000-0000-4000-8000-000000000002",
		key: "dexterite",
		label: "Dextérité",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Dextérité.",
	},
	{
		id: "b0000000-0000-4000-8000-000000000003",
		key: "constitution",
		label: "Constitution",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Constitution.",
	},
	{
		id: "b0000000-0000-4000-8000-000000000004",
		key: "intelligence",
		label: "Intelligence",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique d'Intelligence.",
	},
	{
		id: "b0000000-0000-4000-8000-000000000005",
		key: "sagesse",
		label: "Sagesse",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Sagesse.",
	},
	{
		id: "b0000000-0000-4000-8000-000000000006",
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
		id: "b0000000-0000-4000-8000-000000000010",
		key: "niveau",
		label: "Niveau",
		type: "number",
		defaultValue: "1",
		description: "Niveau du personnage.",
	},
	{
		id: "b0000000-0000-4000-8000-000000000011",
		key: "ca",
		label: "Classe d'armure",
		type: "number",
		defaultValue: "10",
		description: "Classe d'armure (CA).",
	},
	{
		id: "b0000000-0000-4000-8000-000000000012",
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
		id: "b0000000-0000-4000-8000-000000000020",
		key: "hp",
		label: "Points de vie",
		type: "resource",
		description: "Points de vie (courants / maximum / temporaires).",
	},
	{
		id: "b0000000-0000-4000-8000-000000000021",
		key: "des_de_vie",
		label: "Dés de vie",
		type: "resource",
		description: "Dés de vie disponibles pour récupérer des PV.",
	},
	...Array.from({ length: 9 }, (_, i) => {
		const level = i + 1;
		return {
			id: `b0000000-0000-4000-8000-0000000000${String(30 + level).padStart(2, "0")}`,
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
].map((skill, i) => ({
	id: `b0000000-0000-4000-8000-0000000001${String(i + 1).padStart(2, "0")}`,
	key: skill.key,
	label: skill.label,
	type: "boolean" as const,
	defaultValue: "false",
	description: `Maîtrise de la compétence ${skill.label}.`,
}));

/** Divers : inspiration (boolean) et initiative (dérivée). */
const MISC: CharacterSheetPropertyData[] = [
	{
		id: "b0000000-0000-4000-8000-000000000200",
		key: "inspiration",
		label: "Inspiration",
		type: "boolean",
		defaultValue: "false",
		description: "Inspiration héroïque (D&D 5e).",
	},
	{
		id: "b0000000-0000-4000-8000-000000000201",
		key: "initiative",
		label: "Initiative",
		type: "derived",
		description:
			"Valeur dérivée (modificateur de Dextérité). Formule définie par le mapping système (FEAT-160).",
	},
];

/**
 * Catalogue complet des propriétés de fiche D&D 5e, données pures et stables
 * (idempotence du seed via `id`/`key` fixes).
 */
export const DND5E_CHARACTER_SHEET_PROPERTIES: CharacterSheetPropertyData[] = [
	...ABILITIES,
	...STATS,
	...RESOURCES,
	...SKILLS,
	...MISC,
];
