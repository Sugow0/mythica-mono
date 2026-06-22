import { describe, expect, it } from "vitest";
import {
	abilityModifier,
	adjustHp,
	DND5E_ABILITIES,
	DND5E_CHARACTER_STATES,
	DND5E_SKILLS,
	formatModifier,
	groupSpellsByLevel,
	hitDiceEntries,
	parseWeaponDamage,
	proficiencyBonusForLevel,
	rollD20,
	skillBonus,
	spellAttackBonus,
	spellLevelLabel,
	spellSaveDc,
	totalWeight,
	weaponAbilityKey,
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

describe("DND5E_CHARACTER_STATES", () => {
	it("propose normal, stabilisé, mort", () => {
		expect(DND5E_CHARACTER_STATES.map((s) => s.key)).toEqual([
			"normal",
			"stabilise",
			"mort",
		]);
	});
});

describe("adjustHp", () => {
	const base = { current: 20, temp: 0, max: 30 };

	it("soigne sans dépasser le maximum", () => {
		expect(adjustHp(base, 5)).toEqual({ current: 25, temp: 0 });
		expect(adjustHp(base, 100)).toEqual({ current: 30, temp: 0 });
	});

	it("inflige des dégâts (plancher 0)", () => {
		expect(adjustHp(base, -5)).toEqual({ current: 15, temp: 0 });
		expect(adjustHp(base, -999)).toEqual({ current: 0, temp: 0 });
	});

	it("entame d'abord les PV temporaires", () => {
		const s = { current: 20, temp: 5, max: 30 };
		expect(adjustHp(s, -3)).toEqual({ current: 20, temp: 2 });
		expect(adjustHp(s, -8)).toEqual({ current: 17, temp: 0 });
	});

	it("ne soigne pas les PV temporaires", () => {
		const s = { current: 20, temp: 5, max: 30 };
		expect(adjustHp(s, 4)).toEqual({ current: 24, temp: 5 });
	});
});

describe("totalWeight", () => {
	it("somme les quantités × poids", () => {
		expect(
			totalWeight([
				{ quantity: 2, weight: 3 },
				{ quantity: 1, weight: 0.5 },
			])
		).toBe(6.5);
	});
	it("retourne 0 pour un inventaire vide", () => {
		expect(totalWeight([])).toBe(0);
	});
});

describe("spellLevelLabel", () => {
	it("nomme les tours de magie et les niveaux", () => {
		expect(spellLevelLabel(0)).toBe("Tours de magie");
		expect(spellLevelLabel(3)).toBe("Niveau 3");
	});
});

describe("spellSaveDc / spellAttackBonus", () => {
	it("calcule le DD et le bonus d'attaque de sort", () => {
		// mod +3, maîtrise +2
		expect(spellSaveDc(3, 2)).toBe(13);
		expect(spellAttackBonus(3, 2)).toBe(5);
	});
});

describe("parseWeaponDamage", () => {
	it("décompose dé et type de dégâts", () => {
		expect(parseWeaponDamage("1d8 perforant")).toEqual({
			dice: "1d8",
			type: "perforant",
		});
		expect(parseWeaponDamage("2d6 tranchant")).toEqual({
			dice: "2d6",
			type: "tranchant",
		});
	});
	it("tolère les entrées vides ou inattendues", () => {
		expect(parseWeaponDamage(undefined)).toEqual({ dice: "", type: "" });
		expect(parseWeaponDamage("spécial")).toEqual({ dice: "", type: "spécial" });
	});
});

describe("weaponAbilityKey", () => {
	const scores = { force: 16, dexterite: 12 };
	it("Force par défaut", () => {
		expect(weaponAbilityKey("", scores)).toBe("force");
	});
	it("Dextérité pour les armes à distance", () => {
		expect(weaponAbilityKey("Munitions, distance 24/96", scores)).toBe(
			"dexterite"
		);
	});
	it("finesse : meilleur des deux modificateurs", () => {
		expect(weaponAbilityKey("Finesse, légère", scores)).toBe("force"); // FOR 16 > DEX 12
		expect(weaponAbilityKey("Finesse", { force: 10, dexterite: 18 })).toBe(
			"dexterite"
		);
	});
});

describe("hitDiceEntries", () => {
	it("nouveau format : map taille → {current, max}", () => {
		expect(
			hitDiceEntries({
				"6": { current: 3, max: 3 },
				"12": { current: 2, max: 2 },
			})
		).toEqual([
			{ size: 6, current: 3, max: 3 },
			{ size: 12, current: 2, max: 2 },
		]);
	});
	it("ancien format resource unique (taille inconnue)", () => {
		expect(hitDiceEntries({ current: 2, max: 3 })).toEqual([
			{ size: 0, current: 2, max: 3 },
		]);
	});
	it("valeurs vides", () => {
		expect(hitDiceEntries(null)).toEqual([]);
		expect(hitDiceEntries({})).toEqual([]);
	});
	it("conserve une taille si max vidé mais dés restants (édition)", () => {
		expect(hitDiceEntries({ "6": { current: 2, max: 0 } })).toEqual([
			{ size: 6, current: 2, max: 0 },
		]);
	});
});

describe("groupSpellsByLevel", () => {
	it("regroupe par niveau croissant, seulement les niveaux présents", () => {
		const groups = groupSpellsByLevel([
			{ id: "1", name: "Boule de feu", level: 3 },
			{ id: "2", name: "Lumière", level: 0 },
			{ id: "3", name: "Projectile magique", level: 1 },
			{ id: "4", name: "Prestidigitation", level: 0 },
		]);
		expect(groups.map((g) => g.level)).toEqual([0, 1, 3]);
		expect(groups[0].label).toBe("Tours de magie");
		expect(groups[0].spells.map((s) => s.name)).toEqual([
			"Lumière",
			"Prestidigitation",
		]);
	});
	it("retourne un tableau vide sans sorts", () => {
		expect(groupSpellsByLevel([])).toEqual([]);
	});
});
