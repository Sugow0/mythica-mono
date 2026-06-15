import { describe, expect, it } from "vitest";
import {
	buildCalendar,
	dayKey,
	groupByDay,
	monthLabel,
	shiftMonth,
} from "./session-calendar";

describe("dayKey", () => {
	it("formate en YYYY-MM-DD avec zéros", () => {
		expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
		expect(dayKey(new Date(2026, 11, 31))).toBe("2026-12-31");
	});
});

describe("buildCalendar", () => {
	it("retourne 6 semaines de 7 jours", () => {
		const grid = buildCalendar(2026, 6); // juillet 2026
		expect(grid).toHaveLength(6);
		for (const week of grid) expect(week).toHaveLength(7);
	});

	it("commence le lundi", () => {
		// 1er juillet 2026 = mercredi → la grille démarre lundi 29 juin
		const grid = buildCalendar(2026, 6);
		expect(grid[0][0].date.getDay()).toBe(1); // lundi
		expect(grid[0][0].inMonth).toBe(false);
		expect(grid[0][0].key).toBe("2026-06-29");
	});

	it("marque inMonth correctement", () => {
		const grid = buildCalendar(2026, 6);
		const days = grid.flat();
		const inJuly = days.filter((d) => d.inMonth);
		expect(inJuly).toHaveLength(31);
		expect(inJuly[0].key).toBe("2026-07-01");
		expect(inJuly.at(-1)?.key).toBe("2026-07-31");
	});
});

describe("groupByDay", () => {
	it("regroupe par jour local", () => {
		// Timestamps construits en heure locale pour être indépendants du fuseau.
		const items = [
			{ id: "a", scheduledAt: new Date(2026, 6, 15, 10, 30).getTime() },
			{ id: "b", scheduledAt: new Date(2026, 6, 15, 14, 0).getTime() },
			{ id: "c", scheduledAt: new Date(2026, 6, 20, 18, 0).getTime() },
		];
		const map = groupByDay(items);
		expect(map.get("2026-07-15")).toHaveLength(2);
		expect(map.get("2026-07-20")).toHaveLength(1);
	});

	it("ignore les dates nulles, objets ou invalides", () => {
		const items = [
			{ id: "a", scheduledAt: null },
			{ id: "b", scheduledAt: {} },
			{ id: "c", scheduledAt: "pas-une-date" },
			{ id: "d" },
		];
		const map = groupByDay(items as { scheduledAt?: unknown }[]);
		expect(map.size).toBe(0);
	});
});

describe("monthLabel", () => {
	it("retourne le mois en français", () => {
		expect(monthLabel(2026, 6)).toBe("juillet 2026");
		expect(monthLabel(2026, 0)).toBe("janvier 2026");
	});
});

describe("shiftMonth", () => {
	it("avance et recule sans déborder l'année", () => {
		expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
		expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
		expect(shiftMonth(2026, 5, 0)).toEqual({ year: 2026, month: 5 });
	});
});
