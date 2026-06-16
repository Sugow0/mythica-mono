/**
 * Propriétés de fiche **spécifiques** à D&D 5e (édition 2024), absentes de
 * l'édition 2014 (`character_sheet_properties`).
 *
 * D&D 5e 2024 réutilise l'essentiel du catalogue 2014 : le mapping
 * `game_system_properties` du système `dnd5e-2024` pointe vers les **mêmes**
 * propriétés (mêmes `property_id`, résolus par `key`). Ce fichier ne contient
 * donc QUE les nouveautés 2024 à ajouter au catalogue ; la `key` (unique) reste
 * la clé naturelle et l'`id` est généré en UUID v7 au seed.
 */
import type { CharacterSheetPropertyData } from "./dnd5e-properties";

export const DND5E_2024_EXTRA_PROPERTIES: CharacterSheetPropertyData[] = [
	{
		key: "epuisement",
		label: "Épuisement",
		type: "number",
		defaultValue: "0",
		description:
			"Épuisement numérique (0 à 6) : chaque niveau impose un malus cumulatif de -2 aux tests de D20 ; la mort survient au niveau 6. Nouveauté de D&D 5e 2024.",
	},
];
