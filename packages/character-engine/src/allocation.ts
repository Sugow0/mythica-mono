/**
 * Primitives **génériques** de génération des caractéristiques. Tout est
 * configurable (réserve, table de coûts, bornes, valeurs) afin de servir
 * n'importe quel système, pas seulement D&D.
 */

import type { AbilityScoreMethod, AbilityScores } from "./types";

/** Valeurs par défaut du « standard array » (configurable par étape). */
export const DEFAULT_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Table de coûts du point buy. */
export type PointBuyCostTable = Record<number, number>;

/** Configuration d'une répartition en achat de points. */
export type PointBuyConfig = {
	/** Réserve de points disponible. */
	pool: number;
	/** Coût d'achat par score. */
	costTable: PointBuyCostTable;
	/** Bornes des scores (avant bonus). */
	min: number;
	max: number;
};

/** Coût total d'un score pour une table donnée (jette si hors table). */
export function pointBuyCost(
	score: number,
	costTable: PointBuyCostTable,
): number {
	const cost = costTable[score];
	if (cost === undefined) {
		throw new Error(`Score ${score} hors de la table de coûts du point buy.`);
	}
	return cost;
}

/** Coût total cumulé d'un ensemble de scores. */
export function pointBuyTotalCost(
	scores: AbilityScores,
	costTable: PointBuyCostTable,
): number {
	return Object.values(scores).reduce(
		(sum, score) => sum + pointBuyCost(score, costTable),
		0,
	);
}

/** Résultat de validation d'une répartition. */
export type AllocationValidation = {
	valid: boolean;
	/** Points restants (point buy) ou écart, pour affichage. */
	remaining?: number;
	errors: string[];
};

/** Valide une répartition en achat de points (bornes + budget). */
export function validatePointBuy(
	scores: AbilityScores,
	config: PointBuyConfig,
): AllocationValidation {
	const errors: string[] = [];
	for (const [key, score] of Object.entries(scores)) {
		if (score < config.min || score > config.max) {
			errors.push(
				`Le score "${key}" (${score}) doit être entre ${config.min} et ${config.max}.`,
			);
		}
	}
	let spent = 0;
	try {
		spent = pointBuyTotalCost(scores, config.costTable);
	} catch (e) {
		errors.push((e as Error).message);
	}
	const remaining = config.pool - spent;
	if (remaining < 0) {
		errors.push(`Dépassement du budget de points (${spent}/${config.pool}).`);
	}
	return { valid: errors.length === 0, remaining, errors };
}

/**
 * Valide l'usage exact d'un « standard array » : chaque valeur du tableau doit
 * être affectée une et une seule fois.
 */
export function validateStandardArray(
	scores: AbilityScores,
	array: number[],
): AllocationValidation {
	const errors: string[] = [];
	const assigned = Object.values(scores)
		.slice()
		.sort((a, b) => a - b);
	const expected = array.slice().sort((a, b) => a - b);
	if (assigned.length !== expected.length) {
		errors.push(
			`Il faut affecter exactement ${expected.length} valeurs (reçu ${assigned.length}).`,
		);
	} else if (!assigned.every((v, i) => v === expected[i])) {
		errors.push(
			"Les valeurs affectées ne correspondent pas au tableau standard.",
		);
	}
	return { valid: errors.length === 0, errors };
}

/** Source d'aléa injectable (déterminisme des tests). */
export type Rng = () => number;

/** Lance un dé à `sides` faces avec un RNG. */
function rollDie(sides: number, rng: Rng): number {
	return Math.floor(rng() * sides) + 1;
}

/** Lance 4d6 et garde les 3 meilleurs. */
export function roll4d6DropLowest(rng: Rng = Math.random): number {
	const dice = [
		rollDie(6, rng),
		rollDie(6, rng),
		rollDie(6, rng),
		rollDie(6, rng),
	].sort((a, b) => b - a);
	return dice[0] + dice[1] + dice[2];
}

/** Génère `count` valeurs de caractéristiques (4d6 garde 3), triées décroissant. */
export function rollAbilityScores(count = 6, rng: Rng = Math.random): number[] {
	return Array.from({ length: count }, () => roll4d6DropLowest(rng)).sort(
		(a, b) => b - a,
	);
}

/**
 * Applique des bonus (ex. raciaux) à un jeu de scores de base. Pur : ne mute pas
 * les entrées.
 */
export function applyAbilityBonuses(
	base: AbilityScores,
	bonuses: AbilityScores,
): AbilityScores {
	const result: AbilityScores = { ...base };
	for (const [key, bonus] of Object.entries(bonuses)) {
		result[key] = (result[key] ?? 0) + bonus;
	}
	return result;
}

/** Aiguille de validation selon la méthode choisie. */
export function validateAllocation(
	method: AbilityScoreMethod,
	scores: AbilityScores,
	options: { pointBuy?: PointBuyConfig; standardArray?: number[] } = {},
): AllocationValidation {
	switch (method) {
		case "point_buy":
			if (!options.pointBuy) {
				return { valid: false, errors: ["Configuration point buy manquante."] };
			}
			return validatePointBuy(scores, options.pointBuy);
		case "standard_array":
			if (!options.standardArray) {
				return { valid: false, errors: ["Tableau standard manquant."] };
			}
			return validateStandardArray(scores, options.standardArray);
		case "dice_roll":
		case "manual":
			// Aucune contrainte arithmétique imposée (jets faits à la table / saisie libre).
			return { valid: true, errors: [] };
	}
}
