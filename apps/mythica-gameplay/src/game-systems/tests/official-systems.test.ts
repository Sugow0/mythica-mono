import { describe, expect, it } from "bun:test";
import { OFFICIAL_GAME_SYSTEMS } from "../official-systems";

describe("OFFICIAL_GAME_SYSTEMS", () => {
	it("contient les 4 systèmes officiels attendus", () => {
		expect(OFFICIAL_GAME_SYSTEMS.map((s) => s.slug).sort()).toEqual([
			"coc-7e",
			"dnd5e-2014",
			"dnd5e-2024",
			"pf2e",
		]);
	});

	it("a des slugs et des id uniques", () => {
		const slugs = new Set(OFFICIAL_GAME_SYSTEMS.map((s) => s.slug));
		const ids = new Set(OFFICIAL_GAME_SYSTEMS.map((s) => s.id));
		expect(slugs.size).toBe(OFFICIAL_GAME_SYSTEMS.length);
		expect(ids.size).toBe(OFFICIAL_GAME_SYSTEMS.length);
	});

	it("ne référence que des parentSlug existants", () => {
		const slugs = new Set(OFFICIAL_GAME_SYSTEMS.map((s) => s.slug));
		for (const s of OFFICIAL_GAME_SYSTEMS) {
			if (s.parentSlug !== null) expect(slugs.has(s.parentSlug)).toBe(true);
		}
	});

	it("marque tous les systèmes comme officiels", () => {
		expect(OFFICIAL_GAME_SYSTEMS.every((s) => s.isOfficial)).toBe(true);
	});

	it("fait hériter D&D5e 2024 de 2014", () => {
		const v2024 = OFFICIAL_GAME_SYSTEMS.find((s) => s.slug === "dnd5e-2024");
		expect(v2024?.parentSlug).toBe("dnd5e-2014");
	});
});
