import { beforeEach, describe, expect, it, mock } from "bun:test";

const p = {
	session: {
		findUnique: mock(async () => null as unknown),
		update: mock(async () => ({}) as unknown),
	},
	campaign: { findFirst: mock(async () => null as unknown) },
	campaignMember: { findFirst: mock(async () => null as unknown) },
};
mock.module("../../lib/prisma", () => ({ prisma: p }));

const {
	startCombat,
	advanceTurn,
	setTurn,
	emptyCombat,
	parseCombatCommand,
	handleCombatCommand,
} = require("../session-combat") as typeof import("../session-combat");

const SID = "55555555-5555-5555-5555-555555555555";
const CID = "44444444-4444-4444-4444-444444444444";
const OWNER = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";

describe("réducteurs de combat (purs)", () => {
	it("startCombat ordonne et active le premier", () => {
		expect(startCombat(["a", "b", "c"])).toEqual({
			started: true,
			order: ["a", "b", "c"],
			activeIndex: 0,
			round: 1,
			activeTurn: "a",
		});
	});

	it("advanceTurn passe au suivant", () => {
		const s = advanceTurn(startCombat(["a", "b"]));
		expect(s.activeTurn).toBe("b");
		expect(s.round).toBe(1);
	});

	it("advanceTurn boucle et incrémente la manche", () => {
		let s = startCombat(["a", "b"]);
		s = advanceTurn(s); // b
		s = advanceTurn(s); // retour à a, manche 2
		expect(s.activeTurn).toBe("a");
		expect(s.round).toBe(2);
	});

	it("advanceTurn est sans effet hors combat", () => {
		const empty = emptyCombat();
		expect(advanceTurn(empty)).toBe(empty);
	});

	it("setTurn force une entrée existante", () => {
		const s = setTurn(startCombat(["a", "b", "c"]), "c");
		expect(s.activeTurn).toBe("c");
		expect(s.activeIndex).toBe(2);
	});

	it("setTurn ignore une entrée absente", () => {
		const start = startCombat(["a", "b"]);
		expect(setTurn(start, "z")).toBe(start);
	});
});

describe("parseCombatCommand", () => {
	it("parse COMBAT_START avec ordre", () => {
		expect(
			parseCombatCommand('{"type":"COMBAT_START","order":["a","b"]}'),
		).toEqual({
			type: "COMBAT_START",
			order: ["a", "b"],
		});
	});
	it("parse TURN_NEXT et TURN_SET", () => {
		expect(parseCombatCommand({ type: "TURN_NEXT" })).toEqual({
			type: "TURN_NEXT",
		});
		expect(parseCombatCommand({ type: "TURN_SET", entryId: "a" })).toEqual({
			type: "TURN_SET",
			entryId: "a",
		});
	});
	it("rejette les trames invalides", () => {
		expect(parseCombatCommand("pas du json")).toBeNull();
		expect(
			parseCombatCommand({ type: "COMBAT_START", order: [1, 2] }),
		).toBeNull();
		expect(parseCombatCommand({ type: "TURN_SET" })).toBeNull();
		expect(parseCombatCommand({ type: "message" })).toBeNull();
	});
});

describe("handleCombatCommand", () => {
	beforeEach(() => {
		p.session.findUnique.mockResolvedValue({
			id: SID,
			campaignId: CID,
			combatState: {},
		});
		p.campaign.findFirst.mockResolvedValue({
			id: CID,
			ownerId: OWNER,
			nom: "C",
			deletedAt: null,
		});
		p.campaignMember.findFirst.mockResolvedValue(null);
		p.session.update.mockClear();
	});

	it("le MJ (propriétaire) démarre le combat et persiste", async () => {
		const evt = await handleCombatCommand(SID, OWNER, {
			type: "COMBAT_START",
			order: ["a", "b"],
		});
		expect(evt).toMatchObject({
			type: "COMBAT_STATE",
			activeTurn: "a",
			started: true,
		});
		const arg = p.session.update.mock.calls[0]?.[0] as {
			data: { combatState: { activeTurn: string } };
		};
		expect(arg.data.combatState.activeTurn).toBe("a");
	});

	it("refuse un joueur non-MJ", async () => {
		p.campaignMember.findFirst.mockResolvedValue({ role: "player" });
		const evt = await handleCombatCommand(SID, PLAYER, {
			type: "COMBAT_START",
			order: ["a"],
		});
		expect(evt).toBeNull();
		expect(p.session.update).not.toHaveBeenCalled();
	});

	it("TURN_NEXT charge l'état courant et avance", async () => {
		p.session.findUnique.mockResolvedValue({
			id: SID,
			campaignId: CID,
			combatState: {
				started: true,
				order: ["a", "b"],
				activeIndex: 0,
				round: 1,
				activeTurn: "a",
			},
		});
		const evt = await handleCombatCommand(SID, OWNER, { type: "TURN_NEXT" });
		expect(evt?.activeTurn).toBe("b");
	});

	it("refuse si la session est introuvable", async () => {
		p.session.findUnique.mockResolvedValue(null);
		const evt = await handleCombatCommand(SID, OWNER, { type: "TURN_NEXT" });
		expect(evt).toBeNull();
	});
});
