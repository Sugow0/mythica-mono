/**
 * Systèmes de jeu officiels seedés dans `game_systems`.
 *
 * Les `id` sont fixes (idempotence du seed) et `parentSlug` exprime l'héritage
 * de système (ex. D&D5e 2024 hérite de 2014). Le seed résout `parentSlug` en
 * `parentSystemId` à l'insertion.
 */
export type OfficialGameSystem = {
	id: string;
	nom: string;
	version: string;
	slug: string;
	parentSlug: string | null;
	isOfficial: boolean;
	description: string;
};

export const OFFICIAL_GAME_SYSTEMS: OfficialGameSystem[] = [
	{
		id: "a0000000-0000-4000-8000-000000000001",
		nom: "Donjons & Dragons 5e (2014)",
		version: "2014",
		slug: "dnd5e-2014",
		parentSlug: null,
		isOfficial: true,
		description: "Système D&D 5e, édition 2014 (SRD).",
	},
	{
		id: "a0000000-0000-4000-8000-000000000002",
		nom: "Donjons & Dragons 5e (2024)",
		version: "2024",
		slug: "dnd5e-2024",
		parentSlug: "dnd5e-2014",
		isOfficial: true,
		description: "Système D&D 5e, édition 2024 (hérite de 2014).",
	},
	{
		id: "a0000000-0000-4000-8000-000000000003",
		nom: "L'Appel de Cthulhu 7e",
		version: "7e",
		slug: "coc-7e",
		parentSlug: null,
		isOfficial: true,
		description: "Call of Cthulhu, 7e édition.",
	},
	{
		id: "a0000000-0000-4000-8000-000000000004",
		nom: "Pathfinder 2e",
		version: "2e",
		slug: "pf2e",
		parentSlug: null,
		isOfficial: true,
		description: "Pathfinder, 2e édition.",
	},
];
