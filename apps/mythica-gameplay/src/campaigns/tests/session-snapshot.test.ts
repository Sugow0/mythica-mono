import { beforeEach, describe, expect, it, mock } from "bun:test";

const p = {
	session: { findUnique: mock(async () => null as unknown) },
	message: { findMany: mock(async () => [] as unknown[]) },
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

beforeEach(() => {
	p.session.findUnique.mockResolvedValue(null);
	p.message.findMany.mockResolvedValue([]);
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
});
