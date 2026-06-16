/**
 * Mapping système ↔ propriété de fiche pour D&D 5e (édition 2024), seedé dans
 * `game_system_properties`.
 *
 * D&D 5e 2024 **réutilise intégralement** le mapping 2014
 * (`DND5E_PROPERTY_MAPPINGS`) : mêmes propriétés, donc mêmes `property_id`,
 * résolus par `key` au seed. On y ajoute uniquement les propriétés spécifiques
 * 2024 (cf. `DND5E_2024_EXTRA_PROPERTIES`), avec un `displayOrder` à la suite.
 */
import {
	DND5E_PROPERTY_MAPPINGS,
	type GameSystemPropertyMapping,
} from "./dnd5e-system-properties";

/** Slug du système ciblé par ce mapping (D&D 5e, édition 2024). */
export const DND5E_2024_SYSTEM_SLUG = "dnd5e-2024";

/**
 * Mapping des propriétés de fiche vers `dnd5e-2024` : tout le mapping 2014
 * réutilisé tel quel, suivi des nouveautés 2024.
 */
export const DND5E_2024_PROPERTY_MAPPINGS: GameSystemPropertyMapping[] = [
	...DND5E_PROPERTY_MAPPINGS,
	{
		propertyKey: "epuisement",
		displayOrder: DND5E_PROPERTY_MAPPINGS.length,
		groupName: "Combat",
		isRequired: false,
	},
];
