/**
 * Équipement et richesse de départ par classe (D&D 5e 2014, aidedd).
 *
 * - `STARTING_GOLD` : dés de richesse de départ, un unique lancer par classe.
 * - `STARTING_EQUIPMENT` : groupes de choix d'équipement de la classe. Un groupe
 *   à une seule option est un octroi fixe ; sinon le joueur choisit une option.
 *
 * Tous les `slug` référencent des objets existants de `DND5E_EQUIPMENT`.
 */

import type {
	EquipmentChoiceGroup,
	EquipmentEntry,
	EquipmentOption,
	StartingGoldRoll,
} from "./types";

const e = (slug: string, qty = 1): EquipmentEntry => ({ slug, qty });
const opt = (label: string, ...items: EquipmentEntry[]): EquipmentOption => ({
	label,
	items,
});
/** Octroi fixe : groupe à une seule option. */
const fixed = (...items: EquipmentEntry[]): EquipmentChoiceGroup => ({
	options: [opt("Octroi", ...items)],
});
const choice = (...options: EquipmentOption[]): EquipmentChoiceGroup => ({
	options,
});

/** Dés de richesse de départ par classe (aidedd). */
export const STARTING_GOLD: Record<string, StartingGoldRoll> = {
	barbare: { dice: 2, sides: 4, mult: 10 },
	barde: { dice: 5, sides: 4, mult: 10 },
	clerc: { dice: 5, sides: 4, mult: 10 },
	druide: { dice: 2, sides: 4, mult: 10 },
	ensorceleur: { dice: 3, sides: 4, mult: 10 },
	guerrier: { dice: 5, sides: 4, mult: 10 },
	magicien: { dice: 4, sides: 4, mult: 10 },
	moine: { dice: 5, sides: 4, mult: 1 },
	paladin: { dice: 5, sides: 4, mult: 10 },
	rodeur: { dice: 5, sides: 4, mult: 10 },
	roublard: { dice: 4, sides: 4, mult: 10 },
	sorcier: { dice: 4, sides: 4, mult: 10 },
};

/** Groupes de choix d'équipement de départ par classe. */
export const STARTING_EQUIPMENT: Record<string, EquipmentChoiceGroup[]> = {
	barbare: [
		choice(
			opt("Une hache à deux mains", e("hache-a-deux-mains")),
			opt("Une épée à deux mains", e("epee-a-deux-mains")),
		),
		choice(
			opt("Deux hachettes", e("hachette", 2)),
			opt("Une javeline", e("javeline")),
		),
		fixed(e("javeline", 4), e("sac-a-dos")),
	],
	barde: [
		choice(
			opt("Une rapière", e("rapiere")),
			opt("Une épée longue", e("epee-longue")),
			opt("Une dague", e("dague")),
		),
		choice(
			opt("Une cornemuse", e("cornemuse")),
			opt("Une flûte de pan", e("flute-de-pan")),
			opt("Un tambour", e("tambour")),
		),
		fixed(e("cuir"), e("dague"), e("sac-a-dos")),
	],
	clerc: [
		choice(
			opt("Une masse d'armes", e("masse-darmes")),
			opt("Un marteau de guerre", e("marteau-de-guerre")),
		),
		choice(
			opt("Une chemise d'écailles", e("ecailles")),
			opt("Une armure de cuir", e("cuir")),
			opt("Une cotte de mailles", e("cotte-de-mailles")),
		),
		choice(
			opt(
				"Une arbalète légère et 20 carreaux",
				e("arbalete-legere"),
				e("carreaux-darbalete", 20),
			),
			opt("Un bâton", e("baton")),
		),
		fixed(e("bouclier"), e("amulette")),
	],
	druide: [
		choice(
			opt("Un bouclier en bois", e("bouclier")),
			opt("Une arme simple", e("baton")),
		),
		choice(
			opt("Un cimeterre", e("cimeterre")),
			opt("Une arme de corps à corps simple", e("massue")),
		),
		fixed(e("cuir"), e("kit-dherboriste"), e("branche-de-gui")),
	],
	ensorceleur: [
		choice(
			opt(
				"Une arbalète légère et 20 carreaux",
				e("arbalete-legere"),
				e("carreaux-darbalete", 20),
			),
			opt("Un bâton", e("baton")),
		),
		choice(
			opt("Une sacoche à composantes", e("sacoche-a-composantes")),
			opt("Un focaliseur arcanique (baguette)", e("baguette")),
		),
		fixed(e("dague", 2), e("sac-a-dos")),
	],
	guerrier: [
		choice(
			opt("Une cotte de mailles", e("cotte-de-mailles")),
			opt(
				"Du cuir, un arc long et 20 flèches",
				e("cuir"),
				e("arc-long"),
				e("fleches", 20),
			),
		),
		choice(
			opt("Une épée longue et un bouclier", e("epee-longue"), e("bouclier")),
			opt("Une épée à deux mains", e("epee-a-deux-mains")),
		),
		choice(
			opt(
				"Une arbalète légère et 20 carreaux",
				e("arbalete-legere"),
				e("carreaux-darbalete", 20),
			),
			opt("Deux hachettes", e("hachette", 2)),
		),
		fixed(e("sac-a-dos")),
	],
	magicien: [
		choice(opt("Un bâton", e("baton")), opt("Une dague", e("dague"))),
		choice(
			opt("Une sacoche à composantes", e("sacoche-a-composantes")),
			opt("Un focaliseur arcanique (baguette)", e("baguette")),
		),
		fixed(e("grimoire"), e("sac-a-dos")),
	],
	moine: [
		choice(
			opt("Une épée courte", e("epee-courte")),
			opt("Une arme simple", e("baton")),
		),
		fixed(e("flechette", 10), e("sac-a-dos")),
	],
	paladin: [
		choice(
			opt("Une épée longue et un bouclier", e("epee-longue"), e("bouclier")),
			opt("Une épée à deux mains", e("epee-a-deux-mains")),
		),
		choice(
			opt("Cinq javelines", e("javeline", 5)),
			opt("Une arme de corps à corps simple", e("massue")),
		),
		fixed(e("cotte-de-mailles"), e("amulette")),
	],
	rodeur: [
		choice(
			opt("Une chemise d'écailles", e("ecailles")),
			opt("Une armure de cuir", e("cuir")),
		),
		choice(
			opt("Deux épées courtes", e("epee-courte", 2)),
			opt("Deux armes de corps à corps simples", e("hachette", 2)),
		),
		fixed(e("arc-long"), e("fleches", 20), e("sac-a-dos")),
	],
	roublard: [
		choice(
			opt("Une rapière", e("rapiere")),
			opt("Une épée courte", e("epee-courte")),
		),
		choice(
			opt("Un arc court et 20 flèches", e("arc-court"), e("fleches", 20)),
			opt("Une épée courte", e("epee-courte")),
		),
		fixed(e("cuir"), e("dague", 2), e("outils-de-voleur"), e("sac-a-dos")),
	],
	sorcier: [
		choice(
			opt(
				"Une arbalète légère et 20 carreaux",
				e("arbalete-legere"),
				e("carreaux-darbalete", 20),
			),
			opt("Une arme simple", e("baton")),
		),
		choice(
			opt("Une sacoche à composantes", e("sacoche-a-composantes")),
			opt("Un focaliseur arcanique (baguette)", e("baguette")),
		),
		fixed(e("cuir"), e("dague", 2), e("sac-a-dos")),
	],
};
