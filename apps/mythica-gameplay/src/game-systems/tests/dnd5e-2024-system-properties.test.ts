import { describe, expect, it } from "bun:test";
import { DND5E_2024_EXTRA_PROPERTIES } from "../dnd5e-2024-properties";
import {
	DND5E_2024_PROPERTY_MAPPINGS,
	DND5E_2024_SYSTEM_SLUG,
} from "../dnd5e-2024-system-properties";
import { DND5E_CHARACTER_SHEET_PROPERTIES } from "../dnd5e-properties";
import { DND5E_PROPERTY_MAPPINGS } from "../dnd5e-system-properties";

describe("DND5E_2024_SYSTEM_SLUG", () => {
	it("cible le système dnd5e-2024", () => {
		expect(DND5E_2024_SYSTEM_SLUG).toBe("dnd5e-2024");
	});
});

describe("DND5E_2024_PROPERTY_MAPPINGS", () => {
	it("réutilise l'intégralité du mapping 2014 puis les nouveautés 2024", () => {
		expect(DND5E_2024_PROPERTY_MAPPINGS.length).toBe(
			DND5E_PROPERTY_MAPPINGS.length + DND5E_2024_EXTRA_PROPERTIES.length,
		);
		// Les premières entrées sont exactement le mapping 2014 (mêmes property_id).
		const reused = DND5E_2024_PROPERTY_MAPPINGS.slice(
			0,
			DND5E_PROPERTY_MAPPINGS.length,
		);
		expect(reused).toEqual(DND5E_PROPERTY_MAPPINGS);
	});

	it("a des displayOrder uniques", () => {
		const orders = new Set(
			DND5E_2024_PROPERTY_MAPPINGS.map((m) => m.displayOrder),
		);
		expect(orders.size).toBe(DND5E_2024_PROPERTY_MAPPINGS.length);
	});

	it("ne référence que des propriétés connues (catalogue 2014 + nouveautés 2024)", () => {
		const knownKeys = new Set([
			...DND5E_CHARACTER_SHEET_PROPERTIES.map((p) => p.key),
			...DND5E_2024_EXTRA_PROPERTIES.map((p) => p.key),
		]);
		for (const m of DND5E_2024_PROPERTY_MAPPINGS) {
			expect(knownKeys.has(m.propertyKey)).toBe(true);
		}
	});

	it("mappe les nouveautés 2024 (dont l'épuisement)", () => {
		const mappedKeys = new Set(
			DND5E_2024_PROPERTY_MAPPINGS.map((m) => m.propertyKey),
		);
		for (const p of DND5E_2024_EXTRA_PROPERTIES) {
			expect(mappedKeys.has(p.key)).toBe(true);
		}
		expect(mappedKeys.has("epuisement")).toBe(true);
	});
});
