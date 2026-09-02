import { describe, expect, test } from "bun:test";
import {
	evaluateFormula,
	evaluateProperties,
	formulaDependencies,
	parseFormula,
} from "./formula";

describe("evaluateFormula", () => {
	const resolve = (name: string) =>
		({ dexterite: 16, force: 8, niveau: 5 })[name] ?? 0;

	test("arithmétique et priorités", () => {
		expect(evaluateFormula("2 + 3 * 4", resolve)).toBe(14);
		expect(evaluateFormula("(2 + 3) * 4", resolve)).toBe(20);
		expect(evaluateFormula("10 - 2 - 3", resolve)).toBe(5);
		expect(evaluateFormula("17 % 5", resolve)).toBe(2);
	});

	test("unaire négatif", () => {
		expect(evaluateFormula("-5 + 3", resolve)).toBe(-2);
		expect(evaluateFormula("-(2 + 3)", resolve)).toBe(-5);
	});

	test("références de propriétés", () => {
		expect(evaluateFormula("dexterite", resolve)).toBe(16);
		expect(evaluateFormula("dexterite - force", resolve)).toBe(8);
		expect(evaluateFormula("inconnue", resolve)).toBe(0);
	});

	test("fonctions builtin", () => {
		expect(evaluateFormula("floor(7 / 2)", resolve)).toBe(3);
		expect(evaluateFormula("ceil(niveau / 4) + 1", resolve)).toBe(3);
		expect(evaluateFormula("max(force, dexterite)", resolve)).toBe(16);
		expect(evaluateFormula("min(force, dexterite, 10)", resolve)).toBe(8);
	});

	test("fonctions personnalisées via registre", () => {
		const fns = { mod: (s: number) => Math.floor((s - 10) / 2) };
		expect(evaluateFormula("mod(dexterite)", resolve, fns)).toBe(3);
		expect(evaluateFormula("10 + mod(dexterite)", resolve, fns)).toBe(13);
	});

	test("erreurs de syntaxe", () => {
		expect(() => parseFormula("2 +")).toThrow();
		expect(() => parseFormula("(2 + 3")).toThrow();
		expect(() => evaluateFormula("oups(2)", resolve)).toThrow(/inconnue/);
		expect(() => parseFormula("2 @ 3")).toThrow();
	});
});

describe("formulaDependencies", () => {
	test("liste les clés référencées", () => {
		expect(formulaDependencies("mod(dexterite) + niveau").sort()).toEqual([
			"dexterite",
			"niveau",
		]);
		expect(formulaDependencies("2 + 3")).toEqual([]);
	});
});

describe("evaluateProperties", () => {
	const mod = (s: number) => Math.floor((s - 10) / 2);

	test("résout un graphe de dérivées", () => {
		const result = evaluateProperties({
			base: { dexterite: 16, niveau: 5 },
			formulas: {
				initiative: "mod(dexterite)",
				prof_bonus: "ceil(niveau / 4) + 1",
				perception_passive: "10 + mod(dexterite) + prof_bonus",
			},
			functions: { mod },
		});
		expect(result.initiative).toBe(3);
		expect(result.prof_bonus).toBe(3);
		expect(result.perception_passive).toBe(16);
		// les valeurs de base sont conservées
		expect(result.dexterite).toBe(16);
	});

	test("détecte les cycles", () => {
		expect(() =>
			evaluateProperties({
				base: {},
				formulas: { a: "b + 1", b: "a + 1" },
			}),
		).toThrow(/[Cc]ycle/);
	});

	test("formule vide → valeur de base", () => {
		const result = evaluateProperties({
			base: { force: 12 },
			formulas: { force: "", initiative: "force - 10" },
		});
		expect(result.force).toBe(12);
		expect(result.initiative).toBe(2);
	});
});
