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

const { parseMapCommand, handleMapCommand } =
	require("../session-map") as typeof import("../session-map");

const SID = "55555555-5555-5555-5555-555555555555";
const MID = "66666666-6666-6666-6666-666666666666";
const CID = "44444444-4444-4444-4444-444444444444";
const OWNER = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";

describe("parseMapCommand", () => {
	it("parse FOG_PAINT valide", () => {
		const polygons = [
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 100 },
			],
		];
		expect(parseMapCommand({ type: "FOG_PAINT", polygons })).toEqual({
			type: "FOG_PAINT",
			polygons,
		});
	});

	it("parse FOG_CLEAR", () => {
		expect(parseMapCommand({ type: "FOG_CLEAR" })).toEqual({
			type: "FOG_CLEAR",
		});
	});

	it("parse DICE_ROLL valide", () => {
		const cmd = {
			type: "DICE_ROLL",
			formula: "1d20+3",
			results: [15],
			total: 18,
			isPrivate: false,
		};
		expect(parseMapCommand(cmd)).toEqual(cmd);
	});

	it("rejette FOG_PAINT sans polygones", () => {
		expect(parseMapCommand({ type: "FOG_PAINT" })).toBeNull();
	});
});

describe("handleMapCommand — FOG_PAINT (MJ)", () => {
	beforeEach(() => {
		p.session.findUnique.mockResolvedValue({
			id: SID,
			campaignId: CID,
			mapState: "{}",
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

	it("le MJ peut peindre le fog", async () => {
		const polygons = [
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
		];
		const evt = await handleMapCommand(SID, OWNER, {
			type: "FOG_PAINT",
			polygons,
		});
		expect(evt?.type).toBe("FOG_STATE");
		expect(p.session.update).toHaveBeenCalled();
	});

	it("un joueur ne peut pas peindre le fog", async () => {
		p.campaignMember.findFirst.mockResolvedValue({ role: "player" });
		const polygons = [[{ x: 0, y: 0 }]];
		const evt = await handleMapCommand(SID, PLAYER, {
			type: "FOG_PAINT",
			polygons,
		});
		expect(evt).toBeNull();
	});

	it("FOG_CLEAR remet le fog à zéro", async () => {
		const evt = await handleMapCommand(SID, OWNER, { type: "FOG_CLEAR" });
		expect(evt?.type).toBe("FOG_STATE");
		const arg = p.session.update.mock.calls[0]?.[0] as {
			data: { mapState: string };
		};
		const state = JSON.parse(arg.data.mapState);
		expect(state.fog.revealed).toEqual([]);
	});

	it("DICE_ROLL est broadcasté tel quel sans persistance", async () => {
		const cmd = {
			type: "DICE_ROLL" as const,
			formula: "2d6",
			results: [3, 4],
			total: 7,
			isPrivate: false,
		};
		// OWNER est propriétaire de la campagne => accès valide
		const evt = await handleMapCommand(SID, OWNER, cmd);
		expect(evt?.type).toBe("DICE_ROLL");
		expect(p.session.update).not.toHaveBeenCalled();
	});
});
