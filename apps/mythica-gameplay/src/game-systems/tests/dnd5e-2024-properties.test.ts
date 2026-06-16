import { describe, expect, it } from "bun:test";
import { DND5E_2024_EXTRA_PROPERTIES } from "../dnd5e-2024-properties";
import { DND5E_CHARACTER_SHEET_PROPERTIES } from "../dnd5e-properties";

const VALID_TYPES = [
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

describe("DND5E_2024_EXTRA_PROPERTIES", () => {
	it("ne contient que des nouveautés absentes du catalogue 2014", () => {
		const keys2014 = new Set(
			DND5E_CHARACTER_SHEET_PROPERTIES.map((p) => p.key),
		);
		for (const p of DND5E_2024_EXTRA_PROPERTIES) {
			expect(keys2014.has(p.key)).toBe(false);
		}
	});

	it("a des clés uniques", () => {
		const keys = new Set(DND5E_2024_EXTRA_PROPERTIES.map((p) => p.key));
		expect(keys.size).toBe(DND5E_2024_EXTRA_PROPERTIES.length);
	});

	it("n'utilise que des types valides de l'enum PropertyType", () => {
		for (const p of DND5E_2024_EXTRA_PROPERTIES) {
			expect(VALID_TYPES).toContain(p.type);
		}
	});

	it("respecte la longueur max de clé du schéma (VarChar(100))", () => {
		for (const p of DND5E_2024_EXTRA_PROPERTIES) {
			expect(p.key.length).toBeLessThanOrEqual(100);
			expect(p.label.length).toBeGreaterThan(0);
		}
	});

	it("inclut l'épuisement numérique (number, défaut 0)", () => {
		const epuisement = DND5E_2024_EXTRA_PROPERTIES.find(
			(p) => p.key === "epuisement",
		);
		expect(epuisement).toBeDefined();
		expect(epuisement?.type).toBe("number");
		expect(epuisement?.defaultValue).toBe("0");
	});
});
