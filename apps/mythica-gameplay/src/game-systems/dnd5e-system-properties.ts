/**
 * Mapping système ↔ propriété de fiche pour D&D 5e (édition 2014), seedé dans
 * `game_system_properties`.
 *
 * Ces données sont **indépendantes des id** : chaque entrée référence le système
 * par son `slug` (`DND5E_SYSTEM_SLUG`) et la propriété par sa `key`
 * (`propertyKey`, alignée sur `DND5E_CHARACTER_SHEET_PROPERTIES`). Le seed résout
 * ces clés naturelles en `gameSystemId` / `propertyId` réels et génère l'`id` du
 * lien en UUID v7 à la création (jamais codé en dur). Le seed est idempotent par
 * le couple unique (`gameSystemId`, `propertyId`).
 *
 * Chaque mapping porte son ordre d'affichage global (`displayOrder`, unique et
 * croissant), son groupe d'affichage (`groupName`), son caractère obligatoire
 * (`isRequired`) et, pour les seules propriétés dérivées, sa `formula`.
 */

export type GameSystemPropertyMapping = {
	/** Référence une `key` de `DND5E_CHARACTER_SHEET_PROPERTIES`. */
	propertyKey: string;
	/** Ordre global d'affichage de la fiche (unique, croissant). */
	displayOrder: number;
	/** Groupe d'affichage parmi les 5 groupes autorisés. */
	groupName: string;
	/** Propriété obligatoire à la création d'une fiche. */
	isRequired: boolean;
	/** Formule de calcul, uniquement pour les propriétés dérivées. */
	formula?: string;
};

/** Slug du système ciblé par ce mapping (D&D 5e, édition 2014). */
export const DND5E_SYSTEM_SLUG = "dnd5e-2014";

/**
 * Mapping des 40 propriétés de fiche D&D 5e vers le système `dnd5e-2014`.
 *
 * Ordonné par groupe (Caractéristiques → Combat → Compétences → Sorts →
 * Ressources) puis par ordre interne stable ; `displayOrder` suit cet ordre.
 */
export const DND5E_PROPERTY_MAPPINGS: GameSystemPropertyMapping[] = [
	// — Caractéristiques (6) — toutes obligatoires —
	{
		propertyKey: "force",
		displayOrder: 0,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "dexterite",
		displayOrder: 1,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "constitution",
		displayOrder: 2,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "intelligence",
		displayOrder: 3,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "sagesse",
		displayOrder: 4,
		groupName: "Caractéristiques",
		isRequired: true,
	},
	{
		propertyKey: "charisme",
		displayOrder: 5,
		groupName: "Caractéristiques",
		isRequired: true,
	},

	// — Combat (5) — niveau et ca obligatoires —
	{
		propertyKey: "niveau",
		displayOrder: 6,
		groupName: "Combat",
		isRequired: true,
	},
	{ propertyKey: "ca", displayOrder: 7, groupName: "Combat", isRequired: true },
	{
		propertyKey: "vitesse",
		displayOrder: 8,
		groupName: "Combat",
		isRequired: false,
	},
	{
		propertyKey: "initiative",
		displayOrder: 9,
		groupName: "Combat",
		isRequired: false,
		formula: "dex_modifier",
	},
	{
		propertyKey: "inspiration",
		displayOrder: 10,
		groupName: "Combat",
		isRequired: false,
	},

	// — Compétences (18) —
	{
		propertyKey: "acrobaties",
		displayOrder: 11,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "arcanes",
		displayOrder: 12,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "athletisme",
		displayOrder: 13,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "discretion",
		displayOrder: 14,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "dressage",
		displayOrder: 15,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "escamotage",
		displayOrder: 16,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "histoire",
		displayOrder: 17,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "intimidation",
		displayOrder: 18,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "intuition",
		displayOrder: 19,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "investigation",
		displayOrder: 20,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "medecine",
		displayOrder: 21,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "nature",
		displayOrder: 22,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "perception",
		displayOrder: 23,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "persuasion",
		displayOrder: 24,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "religion",
		displayOrder: 25,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "representation",
		displayOrder: 26,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "survie",
		displayOrder: 27,
		groupName: "Compétences",
		isRequired: false,
	},
	{
		propertyKey: "tromperie",
		displayOrder: 28,
		groupName: "Compétences",
		isRequired: false,
	},

	// — Sorts (9) — emplacements de sorts niveaux 1 à 9 —
	{
		propertyKey: "spell_slots_1",
		displayOrder: 29,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_2",
		displayOrder: 30,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_3",
		displayOrder: 31,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_4",
		displayOrder: 32,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_5",
		displayOrder: 33,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_6",
		displayOrder: 34,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_7",
		displayOrder: 35,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_8",
		displayOrder: 36,
		groupName: "Sorts",
		isRequired: false,
	},
	{
		propertyKey: "spell_slots_9",
		displayOrder: 37,
		groupName: "Sorts",
		isRequired: false,
	},

	// — Ressources (2) — hp obligatoire —
	{
		propertyKey: "hp",
		displayOrder: 38,
		groupName: "Ressources",
		isRequired: true,
	},
	{
		propertyKey: "des_de_vie",
		displayOrder: 39,
		groupName: "Ressources",
		isRequired: false,
	},

	// — Lore (6) — texte libre, renseigné à la création —
	{
		propertyKey: "apparence",
		displayOrder: 40,
		groupName: "Lore",
		isRequired: false,
	},
	{
		propertyKey: "biographie",
		displayOrder: 41,
		groupName: "Lore",
		isRequired: false,
	},
	{
		propertyKey: "personnalite",
		displayOrder: 42,
		groupName: "Lore",
		isRequired: false,
	},
	{
		propertyKey: "liens",
		displayOrder: 43,
		groupName: "Lore",
		isRequired: false,
	},
	{
		propertyKey: "ideaux",
		displayOrder: 44,
		groupName: "Lore",
		isRequired: false,
	},
	{
		propertyKey: "defauts",
		displayOrder: 45,
		groupName: "Lore",
		isRequired: false,
	},
];
