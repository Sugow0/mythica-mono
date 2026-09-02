/**
 * Systèmes de jeu officiels seedés dans `game_systems`.
 *
 * Le `slug` (unique) sert de clé naturelle : le seed est idempotent par `slug`
 * et l'`id` (UUID v7) est généré à la création, jamais codé en dur. `parentSlug`
 * exprime l'héritage de système (ex. les éditions 2014/2024 héritent de `dnd5e`)
 * et est résolu en `parentSystemId` à l'insertion.
 */
export type OfficialGameSystem = {
	nom: string;
	version: string;
	slug: string;
	parentSlug: string | null;
	isOfficial: boolean;
	description: string;
};

export const OFFICIAL_GAME_SYSTEMS: OfficialGameSystem[] = [
	{
		nom: "Donjons & Dragons 5e",
		version: "5e",
		slug: "dnd5e",
		parentSlug: null,
		isOfficial: true,
		description:
			"Système D&D 5e générique : parent commun des éditions 2014 et 2024.",
	},
	{
		nom: "Donjons & Dragons 5e (2014)",
		version: "2014",
		slug: "dnd5e-2014",
		parentSlug: "dnd5e",
		isOfficial: true,
		description: "Système D&D 5e, édition 2014 (SRD).",
	},
	{
		nom: "Donjons & Dragons 5e (2024)",
		version: "2024",
		slug: "dnd5e-2024",
		parentSlug: "dnd5e",
		isOfficial: true,
		description: "Système D&D 5e, édition 2024.",
	},
	{
		nom: "L'Appel de Cthulhu 7e",
		version: "7e",
		slug: "coc-7e",
		parentSlug: null,
		isOfficial: true,
		description: "Call of Cthulhu, 7e édition.",
	},
	{
		nom: "Pathfinder 2e",
		version: "2e",
		slug: "pf2e",
		parentSlug: null,
		isOfficial: true,
		description: "Pathfinder, 2e édition.",
	},
];
