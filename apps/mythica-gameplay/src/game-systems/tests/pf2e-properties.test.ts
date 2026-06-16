import { describe, expect, it } from "bun:test";
import type { PropertyType } from "../dnd5e-properties";
import { PF2E_CHARACTER_SHEET_PROPERTIES } from "../pf2e-properties";

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
	"pf2e_force",
	"pf2e_dexterite",
	"pf2e_constitution",
	"pf2e_intelligence",
	"pf2e_sagesse",
	"pf2e_charisme",
];

const RESOURCE_KEYS = [
	"pf2e_hp",
	"pf2e_actions",
	"pf2e_reaction",
	"pf2e_points_focus",
];

describe("PF2E_CHARACTER_SHEET_PROPERTIES", () => {
	const byKey = new Map(PF2E_CHARACTER_SHEET_PROPERTIES.map((p) => [p.key, p]));

	it("a des clés uniques", () => {
		const keys = new Set(PF2E_CHARACTER_SHEET_PROPERTIES.map((p) => p.key));
		expect(keys.size).toBe(PF2E_CHARACTER_SHEET_PROPERTIES.length);
	});

	it("préfixe toutes les keys par pf2e_ (anti-collision globale)", () => {
		for (const p of PF2E_CHARACTER_SHEET_PROPERTIES) {
			expect(p.key.startsWith("pf2e_")).toBe(true);
		}
	});

	it("n'utilise que des types valides de l'enum PropertyType", () => {
		for (const p of PF2E_CHARACTER_SHEET_PROPERTIES) {
			expect(VALID_TYPES).toContain(p.type);
		}
	});

	it("renseigne un label non vide pour chaque propriété", () => {
		for (const p of PF2E_CHARACTER_SHEET_PROPERTIES) {
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

	it("contient la CA (number, défaut 10)", () => {
		expect(byKey.get("pf2e_ca")?.type).toBe("number");
		expect(byKey.get("pf2e_ca")?.defaultValue).toBe("10");
	});

	it("contient hp, actions, réaction et points de focus en resource", () => {
		for (const key of RESOURCE_KEYS) {
			const prop = byKey.get(key);
			expect(prop).toBeDefined();
			expect(prop?.type).toBe("resource");
		}
	});

	it("contient les 4 traditions de sorts en resource", () => {
		for (const key of [
			"pf2e_sorts_arcanique",
			"pf2e_sorts_divin",
			"pf2e_sorts_occulte",
			"pf2e_sorts_primordial",
		]) {
			expect(byKey.get(key)?.type).toBe("resource");
		}
	});

	it("contient les conditions en multiselect avec options non vides", () => {
		const conditions = byKey.get("pf2e_conditions");
		expect(conditions).toBeDefined();
		expect(conditions?.type).toBe("multiselect");
		const values = conditions?.options?.values as unknown[] | undefined;
		expect(Array.isArray(values)).toBe(true);
		expect((values ?? []).length).toBeGreaterThan(0);
	});

	it("contient les compétences PF2e en number (défaut 0)", () => {
		const skills = PF2E_CHARACTER_SHEET_PROPERTIES.filter((p) =>
			p.key.startsWith("pf2e_comp_"),
		);
		expect(skills.length).toBeGreaterThan(0);
		for (const skill of skills) {
			expect(skill.type).toBe("number");
			expect(skill.defaultValue).toBe("0");
		}
	});

	it("respecte la longueur max de clé du schéma (VarChar(100))", () => {
		for (const p of PF2E_CHARACTER_SHEET_PROPERTIES) {
			expect(p.key.length).toBeLessThanOrEqual(100);
		}
	});

	it("seede le nombre total attendu de propriétés", () => {
		// 6 carac + 4 combat + 18 compétences + 5 sorts + 1 conditions
		expect(PF2E_CHARACTER_SHEET_PROPERTIES.length).toBe(6 + 4 + 18 + 5 + 1);
	});
});
