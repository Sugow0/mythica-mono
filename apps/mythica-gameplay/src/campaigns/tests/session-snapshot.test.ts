import { beforeEach, describe, expect, it, mock } from "bun:test";

const p = {
	session: { findUnique: mock(async () => null as unknown) },
	message: { findMany: mock(async () => [] as unknown[]) },
	sessionToken: { findMany: mock(async () => [] as unknown[]) },
};
mock.module("../../lib/prisma", () => ({ prisma: p }));

const { buildSessionSnapshot, SNAPSHOT_CHAT_LIMIT } =
	require("../session-snapshot") as typeof import("../session-snapshot");

const SID = "55555555-5555-5555-5555-555555555555";
const CID = "44444444-4444-4444-4444-444444444444";

function aSession(extra: Record<string, unknown> = {}) {
	return {
		id: SID,
		campaignId: CID,
		mapState: { grid: "hex" },
		combatState: {},
		activeMap: null,
		...extra,
	};
}
function aMessage(id: string, content: string) {
	return {
		id,
		campaignId: CID,
		userId: "u1",
		content,
		createdAt: new Date(),
		user: { pseudo: "joueur" },
	};
}
function aToken(id: string) {
	return {
		id,
		sessionId: SID,
		characterSheetId: null,
		label: null,
		fileId: null,
		posX: "0",
		posY: "0",
		width: 1,
		height: 1,
		isVisible: true,
		layer: "token",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

beforeEach(() => {
	p.session.findUnique.mockResolvedValue(null);
	p.message.findMany.mockResolvedValue([]);
	p.sessionToken.findMany.mockResolvedValue([]);
});

describe("buildSessionSnapshot", () => {
	it("retourne null si la session n'existe pas", async () => {
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap).toBeNull();
	});

	it("assemble participants, mapState et activeTurn", async () => {
		p.session.findUnique.mockResolvedValue(
			aSession({ combatState: { activeTurn: "u1" } }),
		);
		const snap = await buildSessionSnapshot(SID, ["u1", "u2"]);
		expect(snap).toMatchObject({
			type: "snapshot",
			participants: ["u1", "u2"],
			mapState: { grid: "hex" },
			activeTurn: "u1",
		});
	});

	it("activeTurn vaut null quand le combat n'en définit pas", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap?.activeTurn).toBeNull();
	});

	it("inclut l'historique chat en ordre chronologique", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		// findMany renvoie du plus récent au plus ancien.
		p.message.findMany.mockResolvedValue([
			aMessage("m2", "b"),
			aMessage("m1", "a"),
		]);
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap?.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
	});

	it("limite l'historique à 50 messages", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		await buildSessionSnapshot(SID, []);
		const arg = p.message.findMany.mock.calls.at(-1)?.[0] as { take: number };
		expect(arg.take).toBe(SNAPSHOT_CHAT_LIMIT);
		expect(SNAPSHOT_CHAT_LIMIT).toBe(50);
	});

	it("inclut activeMap null quand aucune carte active", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap?.activeMap).toBeNull();
	});

	it("inclut activeMap quand une carte est définie", async () => {
		const map = { id: "map-1", name: "Donjon" };
		p.session.findUnique.mockResolvedValue(aSession({ activeMap: map }));
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap?.activeMap).toEqual(map);
	});

	it("inclut les tokens de la session", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.sessionToken.findMany.mockResolvedValue([aToken("t1"), aToken("t2")]);
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap?.tokens).toHaveLength(2);
		expect(snap?.tokens[0].id).toBe("t1");
	});

	it("inclut combatState dans le snapshot", async () => {
		const combatState = { activeTurn: "u1", round: 3 };
		p.session.findUnique.mockResolvedValue(aSession({ combatState }));
		const snap = await buildSessionSnapshot(SID, []);
		expect(snap?.combatState).toEqual(combatState);
	});
});
