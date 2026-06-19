import { describe, expect, test } from "bun:test";
import {
	abilityModifier,
	computeSpellSlots,
	meetsMulticlassPrereq,
	multiclassCasterLevel,
	pactMagic,
	proficiencyBonus,
	singleClassSlots,
} from "./rules";

describe("abilityModifier", () => {
	test("valeurs de référence", () => {
		expect(abilityModifier(10)).toBe(0);
		expect(abilityModifier(8)).toBe(-1);
		expect(abilityModifier(16)).toBe(3);
		expect(abilityModifier(20)).toBe(5);
		expect(abilityModifier(1)).toBe(-5);
	});
});

describe("proficiencyBonus", () => {
	test("paliers", () => {
		expect(proficiencyBonus(1)).toBe(2);
		expect(proficiencyBonus(4)).toBe(2);
		expect(proficiencyBonus(5)).toBe(3);
		expect(proficiencyBonus(8)).toBe(3);
		expect(proficiencyBonus(9)).toBe(4);
		expect(proficiencyBonus(13)).toBe(5);
		expect(proficiencyBonus(17)).toBe(6);
		expect(proficiencyBonus(20)).toBe(6);
	});
});

describe("singleClassSlots", () => {
	test("lanceur complet niveau 5", () => {
		expect(singleClassSlots("full", 5)).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
	});

	test("demi-lanceur niveau 5 (paladin)", () => {
		expect(singleClassSlots("half", 5)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
	});

	test("tiers-lanceur niveau 3 (chevalier occulte)", () => {
		expect(singleClassSlots("third", 3)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
	});

	test("non lanceur", () => {
		expect(singleClassSlots("none", 10)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
	});
});

describe("pactMagic (occultiste)", () => {
	test("niveaux clés", () => {
		expect(pactMagic(1)).toEqual({ count: 1, slotLevel: 1 });
		expect(pactMagic(5)).toEqual({ count: 2, slotLevel: 3 });
		expect(pactMagic(11)).toEqual({ count: 3, slotLevel: 5 });
		expect(pactMagic(17)).toEqual({ count: 4, slotLevel: 5 });
	});
});

describe("multiclassCasterLevel", () => {
	test("paladin 6 / magicien 4 → niveau de lanceur 7", () => {
		const level = multiclassCasterLevel([
			{ slug: "paladin", level: 6, casterType: "half" },
			{ slug: "magicien", level: 4, casterType: "full" },
		]);
		// full 4 + floor(6/2)=3 → 7
		expect(level).toBe(7);
	});

	test("third arrondi inférieur", () => {
		const level = multiclassCasterLevel([
			{ slug: "magicien", level: 2, casterType: "full" },
			{ slug: "roublard-ea", level: 5, casterType: "third" },
		]);
		// full 2 + floor(5/3)=1 → 3
		expect(level).toBe(3);
	});
});

describe("computeSpellSlots", () => {
	test("mono-classe demi-lanceur garde sa propre table", () => {
		const res = computeSpellSlots([
			{ slug: "paladin", level: 5, casterType: "half" },
		]);
		expect(res.slots).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
		expect(res.pact).toBeUndefined();
	});

	test("multiclasse utilise la table unifiée (niveau combiné)", () => {
		const res = computeSpellSlots([
			{ slug: "paladin", level: 6, casterType: "half" },
			{ slug: "magicien", level: 4, casterType: "full" },
		]);
		// niveau combiné 7 → table du lanceur complet niveau 7
		expect(res.slots).toEqual([4, 3, 3, 1, 0, 0, 0, 0, 0]);
	});

	test("occultiste ajoute la magie de pacte séparément", () => {
		const res = computeSpellSlots([
			{ slug: "occultiste", level: 5, casterType: "warlock" },
			{ slug: "barde", level: 4, casterType: "full" },
		]);
		// un seul autre lanceur (barde 4) → sa table de lanceur complet
		expect(res.slots).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0]);
		expect(res.pact).toEqual({ count: 2, slotLevel: 3 });
	});

	test("non lanceur → aucun emplacement", () => {
		const res = computeSpellSlots([
			{ slug: "guerrier", level: 10, casterType: "none" },
		]);
		expect(res.slots).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
	});
});

describe("meetsMulticlassPrereq", () => {
	test("respecte les minima", () => {
		expect(
			meetsMulticlassPrereq(
				{ force: 13, sagesse: 13 },
				{ force: 14, sagesse: 13 },
			),
		).toBe(true);
		expect(
			meetsMulticlassPrereq(
				{ force: 13, sagesse: 13 },
				{ force: 12, sagesse: 13 },
			),
		).toBe(false);
	});
});
