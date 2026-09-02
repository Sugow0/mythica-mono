import { describe, expect, it } from "vitest";
import {
	initialSessionState,
	nextReconnectDelay,
	parseSessionEvent,
	RECONNECT_MAX_MS,
	reduceSessionState,
	type SessionState,
} from "./session-events";

describe("parseSessionEvent", () => {
	it("parse une trame typée", () => {
		expect(parseSessionEvent('{"type":"PRESENCE_JOIN","userId":"u1"}')).toEqual(
			{
				type: "PRESENCE_JOIN",
				userId: "u1",
			}
		);
	});
	it("retourne null pour le bruit / heartbeat", () => {
		expect(parseSessionEvent("ping")).toBeNull();
		expect(parseSessionEvent("{}")).toBeNull();
		expect(parseSessionEvent('{"foo":1}')).toBeNull();
	});
});

describe("reduceSessionState", () => {
	it("ajoute un participant sur PRESENCE_JOIN (sans doublon)", () => {
		let s = initialSessionState;
		s = reduceSessionState(s, { type: "PRESENCE_JOIN", userId: "a" });
		s = reduceSessionState(s, { type: "PRESENCE_JOIN", userId: "b" });
		s = reduceSessionState(s, { type: "PRESENCE_JOIN", userId: "a" });
		expect(s.participants).toEqual(["a", "b"]);
	});

	it("retire un participant sur PRESENCE_LEAVE", () => {
		const start: SessionState = {
			...initialSessionState,
			participants: ["a", "b"],
		};
		const s = reduceSessionState(start, {
			type: "PRESENCE_LEAVE",
			userId: "a",
		});
		expect(s.participants).toEqual(["b"]);
	});

	it("applique un snapshot complet", () => {
		const s = reduceSessionState(initialSessionState, {
			type: "snapshot",
			participants: ["a"],
			mapState: { grid: 1 },
			activeTurn: "a",
		});
		expect(s).toEqual({
			participants: ["a"],
			mapState: { grid: 1 },
			activeTurn: "a",
		});
	});

	it("met à jour l'état de carte et le tour actif", () => {
		let s = reduceSessionState(initialSessionState, {
			type: "map-state",
			mapState: { x: 1 },
		});
		s = reduceSessionState(s, { type: "turn", activeTurn: "b" });
		expect(s.mapState).toEqual({ x: 1 });
		expect(s.activeTurn).toBe("b");
	});

	it("ignore une trame inconnue (état inchangé)", () => {
		const s = reduceSessionState(initialSessionState, { type: "message" });
		expect(s).toBe(initialSessionState);
	});

	it("ne mute pas l'état d'entrée", () => {
		const start: SessionState = { ...initialSessionState, participants: ["a"] };
		reduceSessionState(start, { type: "PRESENCE_JOIN", userId: "b" });
		expect(start.participants).toEqual(["a"]);
	});
});

describe("nextReconnectDelay", () => {
	it("croît exponentiellement", () => {
		expect(nextReconnectDelay(0, 500)).toBe(500);
		expect(nextReconnectDelay(1, 500)).toBe(1000);
		expect(nextReconnectDelay(2, 500)).toBe(2000);
		expect(nextReconnectDelay(3, 500)).toBe(4000);
	});
	it("est borné par le maximum", () => {
		expect(nextReconnectDelay(100)).toBe(RECONNECT_MAX_MS);
	});
});
