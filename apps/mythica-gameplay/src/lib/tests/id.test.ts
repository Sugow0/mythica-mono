import { describe, expect, it } from "bun:test";
import { newId } from "../id";

describe("newId", () => {
	it("génère un UUID au format canonique", () => {
		expect(newId()).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("génère un UUID de version 7 (indexable, non prédictible)", () => {
		// Le chiffre de version est le 1er caractère du 3e groupe (index 14).
		expect(newId().charAt(14)).toBe("7");
	});

	it("génère des identifiants uniques", () => {
		const ids = new Set(Array.from({ length: 1000 }, () => newId()));
		expect(ids.size).toBe(1000);
	});

	it("génère des identifiants ordonnés dans le temps", () => {
		const a = newId();
		const b = newId();
		// UUID v7 : préfixe temporel → l'ordre lexicographique suit le temps.
		expect(a <= b).toBe(true);
	});
});
