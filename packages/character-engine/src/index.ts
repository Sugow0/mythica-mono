/**
 * `@mythica/character-engine` — moteur **générique** de création de personnage.
 *
 * Cœur agnostique au système : types de parcours (`CreationFlow`/`CreationStep`),
 * évaluateur de formules (interaction des caractéristiques) et primitives
 * d'allocation. Les règles propres à un système de jeu (ex. D&D 5e) sont
 * importables séparément via `@mythica/character-engine/dnd5e`.
 */

export * from "./allocation";
export * from "./formula";
export * from "./types";
