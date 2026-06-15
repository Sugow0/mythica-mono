import { describe, expect, it } from "vitest";
import { abilityModifier, DND5E_ABILITIES, formatModifier } from "./dnd5e";

describe("DND5E_ABILITIES", () => {
	it("comporte les 6 caractéristiques", () => {
		expect(DND5E_ABILITIES).toHaveLength(6);
		expect(DND5E_ABILITIES.map((a) => a.abbr)).toEqual([
			"FOR",
			"DEX",
			"CON",
			"INT",
			"SAG",
			"CHA",
		]);
	});
});

describe("abilityModifier", () => {
	it("calcule floor((score - 10) / 2)", () => {
		expect(abilityModifier(10)).toBe(0);
		expect(abilityModifier(11)).toBe(0);
		expect(abilityModifier(12)).toBe(1);
		expect(abilityModifier(8)).toBe(-1);
		expect(abilityModifier(20)).toBe(5);
		expect(abilityModifier(1)).toBe(-5);
	});
});

describe("formatModifier", () => {
	it("préfixe d'un signe explicite", () => {
		expect(formatModifier(0)).toBe("+0");
		expect(formatModifier(3)).toBe("+3");
		expect(formatModifier(-2)).toBe("-2");
	});
});
