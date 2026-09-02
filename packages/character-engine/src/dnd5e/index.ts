/**
 * Règles de calcul D&D 5e (2014), opt-in. Le cœur du moteur (`../index.ts`) reste
 * agnostique ; ce sous-module fournit les fonctions/tables propres à D&D,
 * partagées entre le preview front et la validation back.
 */
export * from "./build";
export * from "./rules";
export * from "./slots";
