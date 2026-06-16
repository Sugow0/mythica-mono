/**
 * Mapping système ↔ propriété de fiche pour Pathfinder 2e (PF2e), seedé dans
 * `game_system_properties`.
 *
 * Ces données sont **indépendantes des id** : chaque entrée référence le système
 * par son `slug` (`PF2E_SYSTEM_SLUG`) et la propriété par sa `key`
 * (`propertyKey`, alignée sur `PF2E_CHARACTER_SHEET_PROPERTIES`). Le seed résout
 * ces clés naturelles en `gameSystemId` / `propertyId` réels et génère l'`id` du
 * lien en UUID v7 à la création (jamais codé en dur). Le seed est idempotent par
 * le couple unique (`gameSystemId`, `propertyId`).
 *
 * Chaque mapping porte son ordre d'affichage global (`displayOrder`, unique et
 * croissant), son groupe d'affichage (`groupName`) et son caractère obligatoire
 * (`isRequired`). PF2e n'utilise pas de propriété dérivée : aucune `formula`.
 */
import type { GameSystemPropertyMapping } from "./dnd5e-system-properties";

/** Slug du système ciblé par ce mapping (Pathfinder 2e). */
export const PF2E_SYSTEM_SLUG = "pf2e";

/**
 * Mapping des propriétés de fiche vers le système `pf2e`.
 *
 * Ordonné par groupe (Caractéristiques → Combat → Compétences → Sorts → États)
 * puis par ordre interne stable ; `displayOrder` suit cet ordre.
 */
export const PF2E_PROPERTY_MAPPINGS: GameSystemPropertyMapping[] = [
	// — Caractéristiques (6) — toutes obligatoires —
	{
		propertyKey: "pf2e_force",
		displayOrder: 0,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_dexterite",
		displayOrder: 1,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_constitution",
		displayOrder: 2,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_intelligence",
		displayOrder: 3,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_sagesse",
		displayOrder: 4,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_charisme",
		displayOrder: 5,
		groupName: "Caractéristiques",
		isRequired: true,
	},

	// — Combat (4) — ca et hp obligatoires —
	{
		propertyKey: "pf2e_ca",
		displayOrder: 6,
		groupName: "Combat",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_hp",
		displayOrder: 7,
		groupName: "Combat",
		isRequired: true,
	},
	{
		propertyKey: "pf2e_actions",
		displayOrder: 8,
		groupName: "Combat",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_reaction",
		displayOrder: 9,
		groupName: "Combat",
		isRequired: false,
	},

	// — Compétences (18) —
	{
		propertyKey: "pf2e_comp_acrobaties",
		displayOrder: 10,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_arcanes",
		displayOrder: 11,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_athletisme",
		displayOrder: 12,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_artisanat",
		displayOrder: 13,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_diplomatie",
		displayOrder: 14,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_duperie",
		displayOrder: 15,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_intimidation",
		displayOrder: 16,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_hermetisme",
		displayOrder: 17,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_medecine",
		displayOrder: 18,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_nature",
		displayOrder: 19,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_discretion",
		displayOrder: 20,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_representation",
		displayOrder: 21,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_religion",
		displayOrder: 22,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_societe",
		displayOrder: 23,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_subterfuge",
		displayOrder: 24,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_survie",
		displayOrder: 25,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_vol",
		displayOrder: 26,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_comp_connaissances",
		displayOrder: 27,
		groupName: "Compétences",
		isRequired: false,
	},

	// — Sorts (5) — 4 traditions + points de focalisation —
	{
		propertyKey: "pf2e_sorts_arcanique",
		displayOrder: 28,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_sorts_divin",
		displayOrder: 29,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_sorts_occulte",
		displayOrder: 30,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_sorts_primordial",
		displayOrder: 31,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "pf2e_points_focus",
		displayOrder: 32,
		groupName: "Sorts",
		isRequired: false,
	},

	// — États (1) — conditions —
	{
		propertyKey: "pf2e_conditions",
		displayOrder: 33,
		groupName: "États",
		isRequired: false,
	},
];
