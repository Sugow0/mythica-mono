/**
 * Mapping système ↔ propriété de fiche pour L'Appel de Cthulhu 7e édition, seedé
 * dans `game_system_properties`.
 *
 * Ces données sont **indépendantes des id** : chaque entrée référence le système
 * par son `slug` (`COC_SYSTEM_SLUG`) et la propriété par sa `key` (`propertyKey`,
 * alignée sur `COC_CHARACTER_SHEET_PROPERTIES`). Le seed résout ces clés
 * naturelles en `gameSystemId` / `propertyId` réels et génère l'`id` du lien en
 * UUID v7 à la création (jamais codé en dur). Le seed est idempotent par le
 * couple unique (`gameSystemId`, `propertyId`).
 *
 * Chaque mapping porte son ordre d'affichage global (`displayOrder`, unique et
 * croissant), son groupe d'affichage (`groupName`) et son caractère obligatoire
 * (`isRequired`). Aucune propriété CoC n'est dérivée : pas de `formula`.
 */
import { COC_CHARACTER_SHEET_PROPERTIES } from "./coc-properties";
import type { GameSystemPropertyMapping } from "./dnd5e-system-properties";

/** Slug du système ciblé par ce mapping (L'Appel de Cthulhu 7e). */
export const COC_SYSTEM_SLUG = "coc-7e";

/** Keys obligatoires : les 8 caractéristiques + points de vie + santé mentale. */
const REQUIRED_KEYS = new Set([
	"coc_for",
	"coc_con",
	"coc_tai",
	"coc_dex",
	"coc_app",
	"coc_int",
	"coc_pou",
	"coc_edu",
	"coc_hp",
	"coc_sante_mentale",
]);

/** Ressources (santé mentale, points de vie, points de magie). */
const RESOURCE_KEYS = new Set(["coc_sante_mentale", "coc_hp", "coc_pdm"]);

/** Équipement et richesse (armes, crédit). */
const EQUIPMENT_KEYS = new Set(["coc_armes", "coc_credit"]);

/** Caractéristiques (les 8 préfixées `coc_for`/`coc_con`/…). */
const CARACTERISTIQUE_KEYS = new Set([
	"coc_for",
	"coc_con",
	"coc_tai",
	"coc_dex",
	"coc_app",
	"coc_int",
	"coc_pou",
	"coc_edu",
]);

/** Détermine le groupe d'affichage d'une propriété à partir de sa key. */
function groupFor(key: string): string {
	if (CARACTERISTIQUE_KEYS.has(key)) return "Caractéristiques";
	if (RESOURCE_KEYS.has(key)) return "Ressources";
	if (EQUIPMENT_KEYS.has(key)) return "Équipement";
	return "Compétences";
}

/**
 * Mapping de toutes les propriétés de fiche CoC vers le système `coc-7e`.
 *
 * L'ordre d'affichage suit l'ordre du catalogue `COC_CHARACTER_SHEET_PROPERTIES`
 * (caractéristiques → ressources → équipement → compétences) ; `displayOrder`
 * est croissant et unique (0..n-1).
 */
export const COC_PROPERTY_MAPPINGS: GameSystemPropertyMapping[] =
	COC_CHARACTER_SHEET_PROPERTIES.map((property, index) => ({
		propertyKey: property.key,
		displayOrder: index,
		groupName: groupFor(property.key),
		isRequired: REQUIRED_KEYS.has(property.key),
	}));
