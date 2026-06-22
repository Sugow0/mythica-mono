import { describe, expect, test } from "bun:test";
import {
	abilityModifier,
	averageHitDie,
	computeHitDice,
	computeHitPoints,
	computeSpellSlots,
	maxSpellSlotLevel,
	meetsMulticlassPrereq,
	multiclassCasterLevel,
	pactMagic,
	preparedSpellsCount,
	preparedSpellsForKind,
	proficiencyBonus,
	rolledHitDiceCount,
	rollHitPointDice,
	singleClassSlots,
	wizardSpellbookSize,
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

describe("maxSpellSlotLevel", () => {
	test("renvoie le niveau de sort le plus élevé disponible", () => {
		expect(maxSpellSlotLevel([4, 3, 2, 0, 0, 0, 0, 0, 0])).toBe(3);
		expect(maxSpellSlotLevel([2, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(1);
		expect(maxSpellSlotLevel([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
	});
});

describe("preparedSpellsCount", () => {
	test("préparant complet : max(1, mod + niveau)", () => {
		expect(preparedSpellsCount(3, 3)).toBe(6); // druide niv 3, Sag 16
		expect(preparedSpellsCount(-1, 1)).toBe(1); // plancher à 1
	});
	test("demi-préparant : max(1, mod + floor(niveau/2))", () => {
		expect(preparedSpellsCount(3, 5, true)).toBe(5); // paladin niv 5 (+2 eff) + 3
		expect(preparedSpellsCount(0, 2, true)).toBe(1); // niv 2 → eff 1
	});
});

describe("preparedSpellsForKind", () => {
	test("préparant complet (prepared / wizard)", () => {
		expect(preparedSpellsForKind("prepared", 3, 3)).toBe(6);
		expect(preparedSpellsForKind("wizard", 3, 3)).toBe(6);
	});
	test("demi-préparant (paladin)", () => {
		expect(preparedSpellsForKind("prepared_half", 3, 5)).toBe(5);
	});
	test("lanceurs non préparants → null", () => {
		expect(preparedSpellsForKind("known", 3, 5)).toBeNull();
		expect(preparedSpellsForKind("pact", 3, 5)).toBeNull();
		expect(preparedSpellsForKind(undefined, 3, 5)).toBeNull();
	});
});

describe("wizardSpellbookSize", () => {
	test("6 au niveau 1, +2 par niveau", () => {
		expect(wizardSpellbookSize(1)).toBe(6);
		expect(wizardSpellbookSize(3)).toBe(10);
		expect(wizardSpellbookSize(20)).toBe(44);
	});
});

describe("averageHitDie", () => {
	test("moyenne fixe par dé", () => {
		expect(averageHitDie(6)).toBe(4);
		expect(averageHitDie(8)).toBe(5);
		expect(averageHitDie(10)).toBe(6);
		expect(averageHitDie(12)).toBe(7);
	});
});

describe("computeHitPoints", () => {
	test("magicien niveau 1 : max du dé + Constitution", () => {
		const res = computeHitPoints({
			classes: [{ hitDie: 6, level: 1, isPrimary: true }],
			conMod: 2,
			method: "average",
		});
		// niveau 1 = 6 (max) + 2 = 8
		expect(res.maxHp).toBe(8);
		expect(res.breakdown).toEqual([{ hitDie: 6, base: 6, source: "max" }]);
	});

	test("magicien niveau 3 (moyenne) : 6 + 4 + 4, +2 Con par niveau", () => {
		const res = computeHitPoints({
			classes: [{ hitDie: 6, level: 3, isPrimary: true }],
			conMod: 2,
			method: "average",
		});
		// (6+2) + (4+2) + (4+2) = 8 + 6 + 6 = 20
		expect(res.maxHp).toBe(20);
		expect(res.breakdown.map((e) => e.source)).toEqual([
			"max",
			"average",
			"average",
		]);
	});

	test("multiclasse : niveau 1 max sur la classe principale uniquement", () => {
		// magicien 3 (principal, d6) / barbare 2 (d12), Con +1
		const res = computeHitPoints({
			classes: [
				{ hitDie: 6, level: 3, isPrimary: true },
				{ hitDie: 12, level: 2 },
			],
			conMod: 1,
			method: "average",
		});
		// magicien : 6 + 4 + 4 ; barbare : 7 + 7 ; + 1 Con × 5 niveaux
		// (6+1)+(4+1)+(4+1) + (7+1)+(7+1) = 7+5+5+8+8 = 33
		expect(res.maxHp).toBe(33);
		expect(res.breakdown[0]).toEqual({ hitDie: 6, base: 6, source: "max" });
	});

	test("méthode lancer : utilise les valeurs fournies dans l'ordre", () => {
		const res = computeHitPoints({
			classes: [{ hitDie: 8, level: 3, isPrimary: true }],
			conMod: 0,
			method: "roll",
			rolls: [5, 3],
		});
		// 8 (max) + 5 + 3 = 16
		expect(res.maxHp).toBe(16);
		expect(res.breakdown.map((e) => e.base)).toEqual([8, 5, 3]);
	});

	test("plancher de 1 PV par niveau avec Constitution négative", () => {
		const res = computeHitPoints({
			classes: [{ hitDie: 6, level: 2, isPrimary: true }],
			conMod: -5,
			method: "average",
		});
		// (6-5)=1 ; (4-5)=-1 → plancher 1 ; total 2
		expect(res.maxHp).toBe(2);
	});

	test("méthode manuelle : renvoie le total fourni", () => {
		const res = computeHitPoints({
			classes: [{ hitDie: 6, level: 3, isPrimary: true }],
			conMod: 2,
			method: "manual",
			manualTotal: 42,
		});
		expect(res.maxHp).toBe(42);
		expect(res.breakdown).toEqual([]);
	});
});

describe("rolledHitDiceCount", () => {
	test("tous les niveaux sauf le premier", () => {
		expect(rolledHitDiceCount([{ hitDie: 6, level: 3, isPrimary: true }])).toBe(
			2,
		);
		expect(
			rolledHitDiceCount([
				{ hitDie: 6, level: 3, isPrimary: true },
				{ hitDie: 12, level: 2 },
			]),
		).toBe(4);
		expect(rolledHitDiceCount([{ hitDie: 8, level: 1 }])).toBe(0);
	});
});

describe("rollHitPointDice", () => {
	test("tire un dé par niveau hors premier, RNG injecté", () => {
		// rng renvoyant 0.99 → toujours la face max
		const rolls = rollHitPointDice(
			[{ hitDie: 6, level: 3, isPrimary: true }],
			() => 0.99,
		);
		expect(rolls).toEqual([6, 6]);
	});
});

describe("computeHitDice", () => {
	test("mono-classe : un seul type de dé", () => {
		expect(computeHitDice([{ hitDie: 6, level: 3, isPrimary: true }])).toEqual({
			"6": { current: 3, max: 3 },
		});
	});

	test("multiclasse : regroupe par taille de dé (3d6 + 2d12)", () => {
		expect(
			computeHitDice([
				{ hitDie: 6, level: 3, isPrimary: true },
				{ hitDie: 12, level: 2 },
			]),
		).toEqual({
			"6": { current: 3, max: 3 },
			"12": { current: 2, max: 2 },
		});
	});

	test("additionne les classes de même dé", () => {
		expect(
			computeHitDice([
				{ hitDie: 8, level: 2, isPrimary: true },
				{ hitDie: 8, level: 3 },
			]),
		).toEqual({ "8": { current: 5, max: 5 } });
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
