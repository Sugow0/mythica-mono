import { beforeEach, describe, expect, it, mock } from "bun:test";

// Évite la connexion Redis du singleton importé par le module.
mock.module("../../lib/redis", () => ({ redis: {}, redisConsumer: {} }));

const { createPresenceTracker, PRESENCE_JOIN, PRESENCE_LEAVE } =
	require("../session-presence-ws") as typeof import("../session-presence-ws");

const SID = "55555555-5555-5555-5555-555555555555";
const ALICE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

type Event = { sessionId: string; message: { type: string; userId: string } };

function setup() {
	const events: Event[] = [];
	const timers: Array<{ cb: () => void; cleared: boolean }> = [];
	const tracker = createPresenceTracker({
		broadcast: (sessionId, message) =>
			events.push({ sessionId, message: message as Event["message"] }),
		setTimer: (cb) => {
			timers.push({ cb, cleared: false });
			return (timers.length - 1) as unknown as ReturnType<typeof setTimeout>;
		},
		clearTimer: (h) => {
			const t = timers[h as unknown as number];
			if (t) t.cleared = true;
		},
	});
	const fireTimers = () => {
		for (const t of timers) if (!t.cleared) t.cb();
	};
	return { tracker, events, fireTimers };
}

const types = (events: Event[]) => events.map((e) => e.message.type);

let s: ReturnType<typeof setup>;
beforeEach(() => {
	s = setup();
});

describe("présence WS", () => {
	it("émet PRESENCE_JOIN à la première connexion", () => {
		s.tracker.connect(SID, ALICE);
		expect(s.events).toEqual([
			{ sessionId: SID, message: { type: PRESENCE_JOIN, userId: ALICE } },
		]);
		expect(s.tracker.isPresent(SID, ALICE)).toBe(true);
	});

	it("n'émet pas de second JOIN pour un onglet supplémentaire", () => {
		s.tracker.connect(SID, ALICE);
		s.tracker.connect(SID, ALICE);
		expect(types(s.events)).toEqual([PRESENCE_JOIN]);
	});

	it("ne quitte pas tant qu'un onglet reste ouvert", () => {
		s.tracker.connect(SID, ALICE);
		s.tracker.connect(SID, ALICE);
		s.tracker.disconnect(SID, ALICE);
		s.fireTimers();
		expect(types(s.events)).toEqual([PRESENCE_JOIN]);
		expect(s.tracker.isPresent(SID, ALICE)).toBe(true);
	});

	it("émet PRESENCE_LEAVE après le délai de grâce", () => {
		s.tracker.connect(SID, ALICE);
		s.tracker.disconnect(SID, ALICE);
		// Pas de LEAVE immédiat.
		expect(types(s.events)).toEqual([PRESENCE_JOIN]);
		s.fireTimers();
		expect(types(s.events)).toEqual([PRESENCE_JOIN, PRESENCE_LEAVE]);
		expect(s.tracker.isPresent(SID, ALICE)).toBe(false);
	});

	it("annule le départ si reconnexion pendant la grâce (ni LEAVE ni nouveau JOIN)", () => {
		s.tracker.connect(SID, ALICE);
		s.tracker.disconnect(SID, ALICE);
		s.tracker.connect(SID, ALICE); // reconnexion avant échéance
		s.fireTimers(); // le timer doit avoir été annulé
		expect(types(s.events)).toEqual([PRESENCE_JOIN]);
		expect(s.tracker.isPresent(SID, ALICE)).toBe(true);
	});

	it("gère plusieurs utilisateurs indépendamment", () => {
		s.tracker.connect(SID, ALICE);
		s.tracker.connect(SID, BOB);
		expect(s.events.map((e) => e.message.userId)).toEqual([ALICE, BOB]);
		expect(types(s.events)).toEqual([PRESENCE_JOIN, PRESENCE_JOIN]);
	});

	it("disconnect est sans effet pour un utilisateur inconnu", () => {
		s.tracker.disconnect(SID, ALICE);
		s.fireTimers();
		expect(s.events).toHaveLength(0);
	});
});
