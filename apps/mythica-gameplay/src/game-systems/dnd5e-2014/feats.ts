/**
 * Dons D&D 5e (2014) — collection "don". Pris à la place d'une amélioration de
 * caractéristique aux paliers d'ASI. Sous-ensemble curé (dons « purs » +
 * demi-dons accordant +1 à une caractéristique). Source : aidedd.org.
 */

import type { FeatData, SystemContentSeed } from "./types";

const feat = (
	slug: string,
	name: string,
	data: FeatData,
	sortOrder: number,
): SystemContentSeed => ({
	collectionKey: "don",
	slug,
	name,
	description: data.description,
	sortOrder,
	data: data as unknown as Record<string, unknown>,
});

export const DND5E_FEATS: SystemContentSeed[] = [
	feat(
		"alerte",
		"Alerte",
		{
			description:
				"+5 à l'initiative, vous ne pouvez pas être surpris tant que vous êtes conscient, et les créatures cachées n'ont pas l'avantage à vous attaquer.",
		},
		0,
	),
	feat(
		"sentinelle",
		"Sentinelle",
		{
			description:
				"Vos attaques d'opportunité réduisent la vitesse de la cible à 0 ; les créatures provoquent une attaque d'opportunité même si elles se Désengagent ; vous pouvez réagir quand une créature proche attaque une autre cible.",
		},
		1,
	),
	feat(
		"chanceux",
		"Chanceux",
		{
			description:
				"3 points de chance par repos long : relancez un d20 (test, attaque ou jet de sauvegarde) ou un jet d'attaque ennemi, et gardez le meilleur résultat.",
		},
		2,
	),
	feat(
		"mobile",
		"Mobile",
		{
			description:
				"+3 m de vitesse ; le terrain difficile ne coûte rien lors d'un Sprint ; pas d'attaque d'opportunité de la créature que vous attaquez au corps à corps.",
		},
		3,
	),
	feat(
		"robuste",
		"Robuste",
		{
			description:
				"Votre maximum de points de vie augmente de 2 par niveau (présent et à venir).",
		},
		4,
	),
	feat(
		"initie-a-la-magie",
		"Initié à la magie",
		{
			description:
				"Apprenez 2 tours de magie et 1 sort de niveau 1 d'une classe au choix (lançable une fois par repos long sans emplacement).",
		},
		5,
	),
	feat(
		"vif",
		"Vif",
		{
			description:
				"+1 en Constitution et maîtrise des jets de sauvegarde de Constitution.",
			abilityBonuses: { constitution: 1 },
			savingThrows: ["constitution"],
		},
		6,
	),
	feat(
		"vigilant",
		"Vigilant",
		{
			description:
				"+1 en Sagesse, +5 aux scores passifs de Perception et d'Investigation, et lecture sur les lèvres.",
			abilityBonuses: { sagesse: 1 },
		},
		7,
	),
	feat(
		"athlete",
		"Athlète",
		{
			description:
				"+1 en Force ; vous vous relevez plus vite, escaladez sans surcoût et sautez après 1,5 m d'élan.",
			abilityBonuses: { force: 1 },
		},
		8,
	),
	feat(
		"acteur",
		"Acteur",
		{
			description:
				"+1 en Charisme ; avantage aux tests de Représentation et Tromperie pour vous faire passer pour quelqu'un d'autre, et imitation de voix.",
			abilityBonuses: { charisme: 1 },
		},
		9,
	),
];
