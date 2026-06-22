import { describe, expect, it } from "bun:test";
import {
	DND5E_CHARACTER_SHEET_PROPERTIES,
	type PropertyType,
} from "../dnd5e-properties";

const VALID_TYPES: PropertyType[] = [
	"text",
	"number",
	"boolean",
	"select",
	"multiselect",
	"textarea",
	"resource",
	"list",
	"derived",
];

const ABILITIES = [
	"force",
	"dexterite",
	"constitution",
	"intelligence",
	"sagesse",
	"charisme",
];

const SKILLS = [
	"acrobaties",
	"arcanes",
	"athletisme",
	"discretion",
	"dressage",
	"escamotage",
	"histoire",
	"intimidation",
	"intuition",
	"investigation",
	"medecine",
	"nature",
	"perception",
	"persuasion",
	"religion",
	"representation",
	"survie",
	"tromperie",
];

const SPELL_SLOTS = Array.from({ length: 9 }, (_, i) => `spell_slots_${i + 1}`);

describe("DND5E_CHARACTER_SHEET_PROPERTIES", () => {
	const byKey = new Map(
		DND5E_CHARACTER_SHEET_PROPERTIES.map((p) => [p.key, p]),
	);

	it("a des clés uniques", () => {
		const keys = new Set(DND5E_CHARACTER_SHEET_PROPERTIES.map((p) => p.key));
		expect(keys.size).toBe(DND5E_CHARACTER_SHEET_PROPERTIES.length);
	});

	it("n'utilise que des types valides de l'enum PropertyType", () => {
		for (const p of DND5E_CHARACTER_SHEET_PROPERTIES) {
			expect(VALID_TYPES).toContain(p.type);
		}
	});

	it("renseigne un label non vide pour chaque propriété", () => {
		for (const p of DND5E_CHARACTER_SHEET_PROPERTIES) {
			expect(p.label.length).toBeGreaterThan(0);
		}
	});

	it("contient les 6 caractéristiques (number, défaut 10)", () => {
		for (const key of ABILITIES) {
			const prop = byKey.get(key);
			expect(prop).toBeDefined();
			expect(prop?.type).toBe("number");
			expect(prop?.defaultValue).toBe("10");
		}
	});

	it("contient les 18 compétences en maîtrise (boolean)", () => {
		for (const key of SKILLS) {
			const prop = byKey.get(key);
			expect(prop).toBeDefined();
			expect(prop?.type).toBe("boolean");
		}
	});

	it("contient les 9 emplacements de sorts (resource)", () => {
		for (const key of SPELL_SLOTS) {
			const prop = byKey.get(key);
			expect(prop).toBeDefined();
			expect(prop?.type).toBe("resource");
		}
	});

	it("contient hp et des_de_vie en tant que ressources", () => {
		expect(byKey.get("hp")?.type).toBe("resource");
		expect(byKey.get("des_de_vie")?.type).toBe("resource");
	});

	it("contient ca, niveau et vitesse (number)", () => {
		expect(byKey.get("ca")?.type).toBe("number");
		expect(byKey.get("niveau")?.type).toBe("number");
		expect(byKey.get("vitesse")?.type).toBe("number");
	});

	it("contient inspiration (boolean) et initiative (derived)", () => {
		expect(byKey.get("inspiration")?.type).toBe("boolean");
		expect(byKey.get("initiative")?.type).toBe("derived");
	});

	it("contient les 6 champs de lore (textarea)", () => {
		for (const key of [
			"apparence",
			"biographie",
			"personnalite",
			"liens",
			"ideaux",
			"defauts",
		]) {
			expect(byKey.get(key)?.type).toBe("textarea");
		}
	});

	it("seede le nombre total attendu de propriétés", () => {
		// 46 de base + 30 ajoutées (sauvegardes, dérivées, identité, maîtrises,
		// monnaie, physique, lore additionnel, expertises).
		expect(DND5E_CHARACTER_SHEET_PROPERTIES.length).toBe(46 + 30);
	});

	it("respecte la longueur max de clé du schéma (VarChar(100))", () => {
		for (const p of DND5E_CHARACTER_SHEET_PROPERTIES) {
			expect(p.key.length).toBeLessThanOrEqual(100);
		}
	});
});
