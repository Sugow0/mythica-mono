/**
 * Module de contenu D&D 5e (2014) : agrège le contenu (races, classes,
 * backgrounds, sorts, équipement) et le parcours de création, prêts à seeder
 * dans `system_content` et `game_system_creation_steps`.
 */

import { DND5E_BACKGROUNDS } from "./backgrounds";
import { DND5E_CLASSES } from "./classes";
import { DND5E_EQUIPMENT } from "./equipment";
import { DND5E_RACES } from "./races";
import { DND5E_SPELLS } from "./spells";
import { DND5E_SUBCLASSES } from "./subclasses";
import type { SystemContentSeed } from "./types";

export {
	type CreationStepSeed,
	DND5E_CREATION_FLOW,
	DND5E_LORE_FIELDS,
} from "./creation-flow";
export type { SystemContentSeed } from "./types";

/** Slug du système ciblé (édition 2014). */
export const DND5E_2014_SLUG = "dnd5e-2014";

/** Tout le contenu D&D 5e 2014 à seeder dans `system_content`. */
export const DND5E_CONTENT: SystemContentSeed[] = [
	...DND5E_RACES,
	...DND5E_CLASSES,
	...DND5E_SUBCLASSES,
	...DND5E_BACKGROUNDS,
	...DND5E_SPELLS,
	...DND5E_EQUIPMENT,
];
