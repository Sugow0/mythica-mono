/**
 * Catalogue des propriétés de fiche Pathfinder 2e (PF2e) seedées dans
 * `character_sheet_properties`.
 *
 * Ce catalogue est **indépendant d'un système** : il décrit les propriétés
 * réutilisables d'une fiche. Le mapping système ↔ propriété
 * (`game_system_properties`) est traité dans `pf2e-system-properties.ts`.
 *
 * La `key` (unique au niveau global) est la clé naturelle : le seed est
 * idempotent par `key` et l'`id` (UUID v7) est généré à la création, jamais
 * codé en dur.
 *
 * Contrainte clé : `character_sheet_properties.key` étant unique globalement et
 * les keys D&D n'étant pas préfixées, **toutes les keys PF2e sont préfixées
 * `pf2e_`** pour éviter toute collision (VarChar(100) max).
 */
import type { CharacterSheetPropertyData } from "./dnd5e-properties";

/** Les 6 caractéristiques de base (number, score par défaut 10). */
const ABILITIES: CharacterSheetPropertyData[] = [
	{
		key: "pf2e_force",
		label: "Force",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Force.",
	},
	{
		key: "pf2e_dexterite",
		label: "Dextérité",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Dextérité.",
	},
	{
		key: "pf2e_constitution",
		label: "Constitution",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Constitution.",
	},
	{
		key: "pf2e_intelligence",
		label: "Intelligence",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique d'Intelligence.",
	},
	{
		key: "pf2e_sagesse",
		label: "Sagesse",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Sagesse.",
	},
	{
		key: "pf2e_charisme",
		label: "Charisme",
		type: "number",
		defaultValue: "10",
		description: "Caractéristique de Charisme.",
	},
];

/** Statistiques de combat (CA + ressources d'action / vitalité). */
const COMBAT: CharacterSheetPropertyData[] = [
	{
		key: "pf2e_ca",
		label: "Classe d'armure",
		type: "number",
		defaultValue: "10",
		description: "Classe d'armure (CA).",
	},
	{
		key: "pf2e_hp",
		label: "Points de vie",
		type: "resource",
		description: "Points de vie (courants / maximum / temporaires).",
	},
	{
		key: "pf2e_actions",
		label: "Actions",
		type: "resource",
		description: "0 à 3 actions par tour.",
	},
	{
		key: "pf2e_reaction",
		label: "Réaction",
		type: "resource",
		description: "1 réaction par tour.",
	},
];

/** Ressources de magie : emplacements/préparation par tradition + focus. */
const SPELLS: CharacterSheetPropertyData[] = [
	{
		key: "pf2e_sorts_arcanique",
		label: "Sorts (tradition arcanique)",
		type: "resource",
		description:
			"Emplacements / préparation de sorts de la tradition arcanique.",
	},
	{
		key: "pf2e_sorts_divin",
		label: "Sorts (tradition divine)",
		type: "resource",
		description: "Emplacements / préparation de sorts de la tradition divine.",
	},
	{
		key: "pf2e_sorts_occulte",
		label: "Sorts (tradition occulte)",
		type: "resource",
		description: "Emplacements / préparation de sorts de la tradition occulte.",
	},
	{
		key: "pf2e_sorts_primordial",
		label: "Sorts (tradition primordiale)",
		type: "resource",
		description:
			"Emplacements / préparation de sorts de la tradition primordiale.",
	},
	{
		key: "pf2e_points_focus",
		label: "Points de focalisation",
		type: "resource",
		description: "Points de focalisation (réserve de focus).",
	},
];

/** Les compétences PF2e (number = degré de maîtrise / bonus, défaut 0). */
const SKILLS: CharacterSheetPropertyData[] = [
	{ key: "pf2e_comp_acrobaties", label: "Acrobaties" },
	{ key: "pf2e_comp_arcanes", label: "Arcanes" },
	{ key: "pf2e_comp_athletisme", label: "Athlétisme" },
	{ key: "pf2e_comp_artisanat", label: "Artisanat" },
	{ key: "pf2e_comp_diplomatie", label: "Diplomatie" },
	{ key: "pf2e_comp_duperie", label: "Duperie" },
	{ key: "pf2e_comp_intimidation", label: "Intimidation" },
	{ key: "pf2e_comp_hermetisme", label: "Hermétisme" },
	{ key: "pf2e_comp_medecine", label: "Médecine" },
	{ key: "pf2e_comp_nature", label: "Nature" },
	{ key: "pf2e_comp_discretion", label: "Discrétion" },
	{ key: "pf2e_comp_representation", label: "Représentation" },
	{ key: "pf2e_comp_religion", label: "Religion" },
	{ key: "pf2e_comp_societe", label: "Société" },
	{ key: "pf2e_comp_subterfuge", label: "Subterfuge" },
	{ key: "pf2e_comp_survie", label: "Survie" },
	{ key: "pf2e_comp_vol", label: "Vol" },
	{ key: "pf2e_comp_connaissances", label: "Connaissances" },
].map((skill) => ({
	key: skill.key,
	label: skill.label,
	type: "number" as const,
	defaultValue: "0",
	description: `Degré de maîtrise / bonus de la compétence ${skill.label}.`,
}));

/** États (conditions) PF2e standard, en sélection multiple. */
const CONDITIONS: CharacterSheetPropertyData[] = [
	{
		key: "pf2e_conditions",
		label: "États",
		type: "multiselect",
		options: {
			values: [
				"Affligé",
				"Agrippé",
				"Aveuglé",
				"Confus",
				"Effrayé",
				"Empoigné",
				"Encombré",
				"Épuisé",
				"Étourdi",
				"Fasciné",
				"Fatigué",
				"Hébété",
				"Immobilisé",
				"Inconscient",
				"Invisible",
				"Malade",
				"Mourant",
				"Paralysé",
				"Pétrifié",
				"Ralenti",
				"Stupéfait",
			],
		},
		description: "États (conditions) affectant le personnage.",
	},
];

/**
 * Catalogue complet des propriétés de fiche Pathfinder 2e, données pures et
 * stables. L'idempotence du seed repose sur la `key` (unique) ; aucun `id`
 * n'est codé en dur — il est généré en UUID v7 à l'insertion.
 */
export const PF2E_CHARACTER_SHEET_PROPERTIES: CharacterSheetPropertyData[] = [
	...ABILITIES,
	...COMBAT,
	...SKILLS,
	...SPELLS,
	...CONDITIONS,
];
