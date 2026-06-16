import { describe, expect, it } from "bun:test";
import { PF2E_CHARACTER_SHEET_PROPERTIES } from "../pf2e-properties";
import {
	PF2E_PROPERTY_MAPPINGS,
	PF2E_SYSTEM_SLUG,
} from "../pf2e-system-properties";

const ALLOWED_GROUPS = [
	"Caractéristiques",
	"Combat",
	"Compétences",
	"Sorts",
	"États",
] as const;

const REQUIRED_KEYS = [
	"pf2e_force",
	"pf2e_dexterite",
	"pf2e_constitution",
	"pf2e_intelligence",
	"pf2e_sagesse",
	"pf2e_charisme",
	"pf2e_ca",
	"pf2e_hp",
];

describe("PF2E_PROPERTY_MAPPINGS", () => {
	it("cible le système pf2e", () => {
		expect(PF2E_SYSTEM_SLUG).toBe("pf2e");
	});

	it("contient un mapping par propriété du catalogue", () => {
		expect(PF2E_PROPERTY_MAPPINGS).toHaveLength(
			PF2E_CHARACTER_SHEET_PROPERTIES.length,
		);
	});

	it("couvre exactement les keys du catalogue (aucune orpheline)", () => {
		const mappingKeys = PF2E_PROPERTY_MAPPINGS.map((m) => m.propertyKey).sort();
		const catalogKeys = PF2E_CHARACTER_SHEET_PROPERTIES.map(
			(p) => p.key,
		).sort();
		expect(mappingKeys).toEqual(catalogKeys);
	});

	it("référence des propertyKey existant tous dans le catalogue", () => {
		const catalogKeys = new Set(
			PF2E_CHARACTER_SHEET_PROPERTIES.map((p) => p.key),
		);
		for (const m of PF2E_PROPERTY_MAPPINGS) {
			expect(catalogKeys.has(m.propertyKey)).toBe(true);
		}
	});

	it("a des propertyKey uniques", () => {
		const keys = PF2E_PROPERTY_MAPPINGS.map((m) => m.propertyKey);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("a des displayOrder tous uniques", () => {
		const orders = PF2E_PROPERTY_MAPPINGS.map((m) => m.displayOrder);
		expect(new Set(orders).size).toBe(orders.length);
	});

	it("n'utilise que les 5 groupes autorisés", () => {
		for (const m of PF2E_PROPERTY_MAPPINGS) {
			expect(ALLOWED_GROUPS).toContain(
				m.groupName as (typeof ALLOWED_GROUPS)[number],
			);
		}
	});

	it("marque isRequired uniquement pour les 8 keys attendues", () => {
		const required = PF2E_PROPERTY_MAPPINGS.filter((m) => m.isRequired)
			.map((m) => m.propertyKey)
			.sort();
		expect(required).toEqual([...REQUIRED_KEYS].sort());
	});

	it("ne définit aucune formule (PF2e n'a pas de propriété dérivée)", () => {
		const withFormula = PF2E_PROPERTY_MAPPINGS.filter(
			(m) => m.formula !== undefined,
		);
		expect(withFormula).toHaveLength(0);
	});
});
