import { describe, expect, it } from "bun:test";
import {
	COC_CHARACTER_SHEET_PROPERTIES,
	type PropertyType,
} from "../coc-properties";

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

const CARACTERISTIQUES = [
	"coc_for",
	"coc_con",
	"coc_tai",
	"coc_dex",
	"coc_app",
	"coc_int",
	"coc_pou",
	"coc_edu",
];

describe("COC_CHARACTER_SHEET_PROPERTIES", () => {
	const byKey = new Map(COC_CHARACTER_SHEET_PROPERTIES.map((p) => [p.key, p]));

	it("a des clés uniques", () => {
		const keys = new Set(COC_CHARACTER_SHEET_PROPERTIES.map((p) => p.key));
		expect(keys.size).toBe(COC_CHARACTER_SHEET_PROPERTIES.length);
	});

	it("préfixe toutes les keys par `coc_`", () => {
		for (const p of COC_CHARACTER_SHEET_PROPERTIES) {
			expect(p.key.startsWith("coc_")).toBe(true);
		}
	});

	it("n'utilise que des keys ASCII en minuscules (slug)", () => {
		for (const p of COC_CHARACTER_SHEET_PROPERTIES) {
			expect(p.key).toMatch(/^[a-z0-9_]+$/);
		}
	});

	it("n'utilise que des types valides de l'enum PropertyType", () => {
		for (const p of COC_CHARACTER_SHEET_PROPERTIES) {
			expect(VALID_TYPES).toContain(p.type);
		}
	});

	it("renseigne un label non vide pour chaque propriété", () => {
		for (const p of COC_CHARACTER_SHEET_PROPERTIES) {
			expect(p.label.length).toBeGreaterThan(0);
		}
	});

	it("respecte la longueur max de clé du schéma (VarChar(100))", () => {
		for (const p of COC_CHARACTER_SHEET_PROPERTIES) {
			expect(p.key.length).toBeLessThanOrEqual(100);
		}
	});

	it("contient les 8 caractéristiques (number, % ; défaut renseigné)", () => {
		for (const key of CARACTERISTIQUES) {
			const prop = byKey.get(key);
			expect(prop).toBeDefined();
			expect(prop?.type).toBe("number");
			expect(prop?.defaultValue).toBe("50");
		}
	});

	it("contient santé mentale, hp et points de magie en ressources", () => {
		expect(byKey.get("coc_sante_mentale")?.type).toBe("resource");
		expect(byKey.get("coc_hp")?.type).toBe("resource");
		expect(byKey.get("coc_pdm")?.type).toBe("resource");
	});

	it("contient le crédit (number, défaut 0)", () => {
		const credit = byKey.get("coc_credit");
		expect(credit?.type).toBe("number");
		expect(credit?.defaultValue).toBe("0");
	});

	it("contient les armes en tant que liste", () => {
		expect(byKey.get("coc_armes")?.type).toBe("list");
	});

	it("contient au moins 50 compétences (number) avec defaultValue", () => {
		const nonSkillKeys = new Set([
			...CARACTERISTIQUES,
			"coc_sante_mentale",
			"coc_hp",
			"coc_pdm",
			"coc_credit",
			"coc_armes",
		]);
		const skills = COC_CHARACTER_SHEET_PROPERTIES.filter(
			(p) => !nonSkillKeys.has(p.key),
		);
		expect(skills.length).toBeGreaterThanOrEqual(50);
		for (const skill of skills) {
			expect(skill.type).toBe("number");
			expect(skill.defaultValue).toBeDefined();
			expect((skill.defaultValue ?? "").length).toBeGreaterThan(0);
		}
	});

	it("seede le nombre total attendu de propriétés", () => {
		// 8 caractéristiques + 3 ressources + 2 équipement + 56 compétences
		expect(COC_CHARACTER_SHEET_PROPERTIES.length).toBe(8 + 3 + 2 + 56);
	});
});
