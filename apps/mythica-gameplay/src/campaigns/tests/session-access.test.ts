import { beforeEach, describe, expect, it, mock } from "bun:test";

const p = {
	campaign: { findFirst: mock(async () => null as unknown) },
	campaignMember: { findFirst: mock(async () => null as unknown) },
	session: { findUnique: mock(async () => null as unknown) },
};
mock.module("../../lib/prisma", () => ({ prisma: p }));

const { resolveSessionAccess, isGameMaster } =
	require("../session-access") as typeof import("../session-access");

const OWNER = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";
const STRANGER = "33333333-3333-3333-3333-333333333333";
const CID = "44444444-4444-4444-4444-444444444444";
const SID = "55555555-5555-5555-5555-555555555555";

function aSession(extra: Record<string, unknown> = {}) {
	return {
		id: SID,
		campaignId: CID,
		status: "scheduled",
		startedAt: null,
		...extra,
	};
}
function aCampaign(extra: Record<string, unknown> = {}) {
	return { id: CID, nom: "Camp", ownerId: OWNER, deletedAt: null, ...extra };
}

beforeEach(() => {
	p.session.findUnique.mockResolvedValue(null);
	p.campaign.findFirst.mockResolvedValue(null);
	p.campaignMember.findFirst.mockResolvedValue(null);
});

describe("resolveSessionAccess", () => {
	it("401 si non authentifié", async () => {
		const r = await resolveSessionAccess(SID, null);
		expect(r).toMatchObject({ ok: false, status: 401 });
	});

	it("404 si session introuvable", async () => {
		const r = await resolveSessionAccess(SID, { id: OWNER, role: null });
		expect(r).toMatchObject({ ok: false, status: 404 });
	});

	it("404 si campagne introuvable/supprimée", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		const r = await resolveSessionAccess(SID, { id: OWNER, role: null });
		expect(r).toMatchObject({ ok: false, status: 404 });
	});

	it("403 si l'utilisateur n'est pas membre", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		const r = await resolveSessionAccess(SID, { id: STRANGER, role: null });
		expect(r).toMatchObject({ ok: false, status: 403 });
	});

	it("ok pour le propriétaire (sans rôle membre)", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		const r = await resolveSessionAccess(SID, { id: OWNER, role: null });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.role).toBeNull();
	});

	it("ok pour un membre joueur (rôle renseigné)", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		p.campaignMember.findFirst.mockResolvedValue({ role: "player" });
		const r = await resolveSessionAccess(SID, { id: PLAYER, role: null });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.role).toBe("player");
	});
});

describe("isGameMaster", () => {
	const campaign = { id: CID, nom: "C", ownerId: OWNER };
	it("vrai pour le propriétaire", () => {
		expect(
			isGameMaster({ campaign, role: null })({ id: OWNER, role: null }),
		).toBe(true);
	});
	it("vrai pour un membre MJ", () => {
		expect(
			isGameMaster({ campaign, role: "gm" })({ id: PLAYER, role: null }),
		).toBe(true);
	});
	it("faux pour un joueur", () => {
		expect(
			isGameMaster({ campaign, role: "player" })({ id: PLAYER, role: null }),
		).toBe(false);
	});
});
