import { describe, expect, it } from "vitest";
import {
	abilityModifier,
	DND5E_ABILITIES,
	DND5E_SKILLS,
	formatModifier,
	proficiencyBonusForLevel,
	rollD20,
	skillBonus,
} from "./dnd5e";

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

describe("DND5E_SKILLS", () => {
	it("comporte les 18 compétences rattachées à une caractéristique valide", () => {
		expect(DND5E_SKILLS).toHaveLength(18);
		const abilities = new Set(DND5E_ABILITIES.map((a) => a.key));
		for (const skill of DND5E_SKILLS)
			expect(abilities.has(skill.ability)).toBe(true);
	});
});

describe("proficiencyBonusForLevel", () => {
	it("suit la progression D&D 5e", () => {
		expect(proficiencyBonusForLevel(1)).toBe(2);
		expect(proficiencyBonusForLevel(4)).toBe(2);
		expect(proficiencyBonusForLevel(5)).toBe(3);
		expect(proficiencyBonusForLevel(9)).toBe(4);
		expect(proficiencyBonusForLevel(20)).toBe(6);
	});
	it("borne les niveaux hors limites", () => {
		expect(proficiencyBonusForLevel(0)).toBe(2);
		expect(proficiencyBonusForLevel(99)).toBe(6);
	});
});

describe("skillBonus", () => {
	it("ajoute le bonus de maîtrise quand maîtrisé", () => {
		// FOR 14 → +2 ; maîtrisé (+2) → +4.
		expect(skillBonus(14, true, 2)).toBe(4);
		expect(skillBonus(14, false, 2)).toBe(2);
		expect(skillBonus(8, true, 3)).toBe(2); // -1 + 3
	});
});

describe("rollD20", () => {
	it("calcule roll + modificateur avec un rng injecté", () => {
		// rng=0 → roll 1 ; rng≈0.999 → roll 20.
		expect(rollD20(3, () => 0)).toEqual({ roll: 1, modifier: 3, total: 4 });
		expect(rollD20(-1, () => 0.999)).toEqual({
			roll: 20,
			modifier: -1,
			total: 19,
		});
	});
	it("reste dans [1+mod, 20+mod]", () => {
		const r = rollD20(2);
		expect(r.roll).toBeGreaterThanOrEqual(1);
		expect(r.roll).toBeLessThanOrEqual(20);
		expect(r.total).toBe(r.roll + 2);
	});
});
