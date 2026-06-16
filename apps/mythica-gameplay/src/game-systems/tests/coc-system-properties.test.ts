import { describe, expect, it } from "bun:test";
import { COC_CHARACTER_SHEET_PROPERTIES } from "../coc-properties";
import {
	COC_PROPERTY_MAPPINGS,
	COC_SYSTEM_SLUG,
} from "../coc-system-properties";

const ALLOWED_GROUPS = [
	"Caractéristiques",
	"Ressources",
	"Compétences",
	"Équipement",
] as const;

const REQUIRED_KEYS = [
	"coc_for",
	"coc_con",
	"coc_tai",
	"coc_dex",
	"coc_app",
	"coc_int",
	"coc_pou",
	"coc_edu",
	"coc_hp",
	"coc_sante_mentale",
];

describe("COC_PROPERTY_MAPPINGS", () => {
	it("cible le système coc-7e", () => {
		expect(COC_SYSTEM_SLUG).toBe("coc-7e");
	});

	it("a la même cardinalité que le catalogue (un mapping par propriété)", () => {
		expect(COC_PROPERTY_MAPPINGS).toHaveLength(
			COC_CHARACTER_SHEET_PROPERTIES.length,
		);
	});

	it("couvre exactement les keys du catalogue (aucune orpheline)", () => {
		const mappingKeys = COC_PROPERTY_MAPPINGS.map((m) => m.propertyKey).sort();
		const catalogKeys = COC_CHARACTER_SHEET_PROPERTIES.map((p) => p.key).sort();
		expect(mappingKeys).toEqual(catalogKeys);
	});

	it("référence des propertyKey existant tous dans le catalogue", () => {
		const catalogKeys = new Set(
			COC_CHARACTER_SHEET_PROPERTIES.map((p) => p.key),
		);
		for (const m of COC_PROPERTY_MAPPINGS) {
			expect(catalogKeys.has(m.propertyKey)).toBe(true);
		}
	});

	it("a des propertyKey uniques", () => {
		const keys = COC_PROPERTY_MAPPINGS.map((m) => m.propertyKey);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("a des displayOrder tous uniques", () => {
		const orders = COC_PROPERTY_MAPPINGS.map((m) => m.displayOrder);
		expect(new Set(orders).size).toBe(orders.length);
	});

	it("n'utilise que les groupes autorisés", () => {
		for (const m of COC_PROPERTY_MAPPINGS) {
			expect(ALLOWED_GROUPS).toContain(
				m.groupName as (typeof ALLOWED_GROUPS)[number],
			);
		}
	});

	it("marque isRequired uniquement pour les keys attendues", () => {
		const required = COC_PROPERTY_MAPPINGS.filter((m) => m.isRequired)
			.map((m) => m.propertyKey)
			.sort();
		expect(required).toEqual([...REQUIRED_KEYS].sort());
	});

	it("ne définit aucune formule (pas de propriété dérivée)", () => {
		const withFormula = COC_PROPERTY_MAPPINGS.filter(
			(m) => m.formula !== undefined,
		);
		expect(withFormula).toHaveLength(0);
	});
});
