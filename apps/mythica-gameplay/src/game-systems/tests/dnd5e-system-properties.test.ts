import { describe, expect, it } from "bun:test";
import { DND5E_CHARACTER_SHEET_PROPERTIES } from "../dnd5e-properties";
import {
	DND5E_PROPERTY_MAPPINGS,
	DND5E_SYSTEM_SLUG,
} from "../dnd5e-system-properties";

const ALLOWED_GROUPS = [
	"Caractéristiques",
	"Combat",
	"Compétences",
	"Sorts",
	"Ressources",
	"Lore",
	"Sauvegardes",
	"Identité",
	"Maîtrises",
	"Trésor",
] as const;

const REQUIRED_KEYS = [
	"force",
	"dexterite",
	"constitution",
	"intelligence",
	"sagesse",
	"charisme",
	"niveau",
	"ca",
	"hp",
];

describe("DND5E_PROPERTY_MAPPINGS", () => {
	it("cible le système dnd5e-2014", () => {
		expect(DND5E_SYSTEM_SLUG).toBe("dnd5e-2014");
	});

	it("contient exactement 77 mappings", () => {
		expect(DND5E_PROPERTY_MAPPINGS).toHaveLength(77);
	});

	it("couvre exactement les keys du catalogue (aucune orpheline)", () => {
		const mappingKeys = DND5E_PROPERTY_MAPPINGS.map(
			(m) => m.propertyKey,
		).sort();
		const catalogKeys = DND5E_CHARACTER_SHEET_PROPERTIES.map(
			(p) => p.key,
		).sort();
		expect(mappingKeys).toEqual(catalogKeys);
	});

	it("a des propertyKey uniques", () => {
		const keys = DND5E_PROPERTY_MAPPINGS.map((m) => m.propertyKey);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("a des displayOrder tous uniques", () => {
		const orders = DND5E_PROPERTY_MAPPINGS.map((m) => m.displayOrder);
		expect(new Set(orders).size).toBe(orders.length);
	});

	it("n'utilise que les groupes autorisés", () => {
		for (const m of DND5E_PROPERTY_MAPPINGS) {
			expect(ALLOWED_GROUPS).toContain(
				m.groupName as (typeof ALLOWED_GROUPS)[number],
			);
		}
	});

	it("respecte la répartition par groupe", () => {
		const count = (group: string) =>
			DND5E_PROPERTY_MAPPINGS.filter((m) => m.groupName === group).length;
		expect(count("Caractéristiques")).toBe(7);
		expect(count("Combat")).toBe(9);
		expect(count("Compétences")).toBe(19);
		expect(count("Sorts")).toBe(11);
		expect(count("Ressources")).toBe(2);
		expect(count("Lore")).toBe(15);
		expect(count("Sauvegardes")).toBe(6);
		expect(count("Identité")).toBe(2);
		expect(count("Maîtrises")).toBe(1);
		expect(count("Trésor")).toBe(5);
	});

	it("marque isRequired uniquement pour les 9 keys attendues", () => {
		const required = DND5E_PROPERTY_MAPPINGS.filter((m) => m.isRequired)
			.map((m) => m.propertyKey)
			.sort();
		expect(required).toEqual([...REQUIRED_KEYS].sort());
	});

	it("définit la formule uniquement sur initiative", () => {
		const withFormula = DND5E_PROPERTY_MAPPINGS.filter(
			(m) => m.formula !== undefined,
		);
		expect(withFormula).toHaveLength(1);
		expect(withFormula[0]?.propertyKey).toBe("initiative");
		expect(withFormula[0]?.formula).toBe("dex_modifier");
	});
});
