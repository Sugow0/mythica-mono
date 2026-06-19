import { describe, expect, test } from "bun:test";
import {
	applyAbilityBonuses,
	DEFAULT_STANDARD_ARRAY,
	pointBuyTotalCost,
	roll4d6DropLowest,
	rollAbilityScores,
	validateAllocation,
	validatePointBuy,
	validateStandardArray,
} from "./allocation";

/** Table de coûts du point buy D&D 5e (8→0 … 15→9). */
const DND_COSTS: Record<number, number> = {
	8: 0,
	9: 1,
	10: 2,
	11: 3,
	12: 4,
	13: 5,
	14: 7,
	15: 9,
};

const config = { pool: 27, costTable: DND_COSTS, min: 8, max: 15 };

describe("point buy", () => {
	test("coût total", () => {
		expect(pointBuyTotalCost({ a: 15, b: 8 }, DND_COSTS)).toBe(9);
	});

	test("répartition valide à 27 points exacts", () => {
		// 15,15,15,8,8,8 → 9+9+9 = 27
		const scores = { f: 15, d: 15, c: 15, i: 8, s: 8, h: 8 };
		const res = validatePointBuy(scores, config);
		expect(res.valid).toBe(true);
		expect(res.remaining).toBe(0);
	});

	test("dépassement du budget invalide", () => {
		const scores = { f: 15, d: 15, c: 15, i: 15, s: 8, h: 8 };
		const res = validatePointBuy(scores, config);
		expect(res.valid).toBe(false);
		expect(res.remaining).toBeLessThan(0);
	});

	test("score hors bornes invalide", () => {
		const res = validatePointBuy({ f: 16 }, config);
		expect(res.valid).toBe(false);
	});
});

describe("standard array", () => {
	test("usage exact valide", () => {
		const scores = { f: 15, d: 14, c: 13, i: 12, s: 10, h: 8 };
		expect(validateStandardArray(scores, DEFAULT_STANDARD_ARRAY).valid).toBe(
			true,
		);
	});

	test("valeur incorrecte invalide", () => {
		const scores = { f: 16, d: 14, c: 13, i: 12, s: 10, h: 8 };
		expect(validateStandardArray(scores, DEFAULT_STANDARD_ARRAY).valid).toBe(
			false,
		);
	});
});

describe("lancer de dés", () => {
	test("4d6 garde 3 : bornes 3..18", () => {
		const rng = makeSequenceRng([0.99, 0.99, 0.99, 0.0]); // 6,6,6,1 → 18
		expect(roll4d6DropLowest(rng)).toBe(18);
	});

	test("rollAbilityScores renvoie 6 valeurs triées décroissant", () => {
		const scores = rollAbilityScores(6, mulberry32(42));
		expect(scores).toHaveLength(6);
		for (let i = 1; i < scores.length; i++) {
			expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
			expect(scores[i]).toBeGreaterThanOrEqual(3);
			expect(scores[i]).toBeLessThanOrEqual(18);
		}
	});
});

describe("applyAbilityBonuses", () => {
	test("additionne sans muter", () => {
		const base = { force: 15, dexterite: 14 };
		const out = applyAbilityBonuses(base, { force: 2, dexterite: 1 });
		expect(out).toEqual({ force: 17, dexterite: 15 });
		expect(base.force).toBe(15);
	});
});

describe("validateAllocation (aiguillage)", () => {
	test("manual et dice_roll sont toujours valides", () => {
		expect(validateAllocation("manual", { f: 99 }).valid).toBe(true);
		expect(validateAllocation("dice_roll", { f: 3 }).valid).toBe(true);
	});

	test("point_buy nécessite la config", () => {
		expect(validateAllocation("point_buy", { f: 8 }).valid).toBe(false);
		expect(
			validateAllocation(
				"point_buy",
				{ f: 15, d: 15, c: 15, i: 8, s: 8, h: 8 },
				{ pointBuy: config },
			).valid,
		).toBe(true);
	});
});

/** RNG déterministe consommant une séquence (boucle si épuisée). */
function makeSequenceRng(seq: number[]): () => number {
	let i = 0;
	return () => seq[i++ % seq.length];
}

/** PRNG déterministe (mulberry32) pour des tests reproductibles. */
function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
