import { beforeEach, describe, expect, it, mock } from "bun:test";

const p = {
	campaign: { findFirst: mock(async () => null as unknown) },
	campaignMember: { findFirst: mock(async () => null as unknown) },
	message: { create: mock(async () => ({}) as unknown) },
};
mock.module("../../../lib/prisma", () => ({ prisma: p }));

const publish = mock(async () => 1);
mock.module("../../../lib/redis", () => ({ redis: { publish } }));

const { postMessageHandler, chatChannel, MAX_MESSAGE_LENGTH } =
	require("./post-message.handler") as typeof import("./post-message.handler");

const CID = "44444444-4444-4444-4444-444444444444";
const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function input(extra: Partial<Parameters<typeof postMessageHandler>[0]> = {}) {
	return { campaignId: CID, userId: OWNER, content: "Bonjour", ...extra };
}

beforeEach(() => {
	p.campaign.findFirst.mockReset();
	p.campaignMember.findFirst.mockReset();
	p.message.create.mockReset();
	p.message.create.mockResolvedValue({
		id: "m1",
		campaignId: CID,
		userId: OWNER,
		content: "Bonjour",
		createdAt: new Date(),
	} as unknown);
	publish.mockClear();
});

describe("chatChannel", () => {
	it("préfixe le canal par l'id de campagne", () => {
		expect(chatChannel(CID)).toBe(`campaign:${CID}:chat`);
	});
});

describe("postMessageHandler", () => {
	it("400 si contenu vide", async () => {
		const r = await postMessageHandler(input({ content: "   " }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("400 si contenu trop long", async () => {
		const r = await postMessageHandler(
			input({ content: "x".repeat(MAX_MESSAGE_LENGTH + 1) }),
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("404 si campagne introuvable", async () => {
		p.campaign.findFirst.mockResolvedValue(null as unknown);
		const r = await postMessageHandler(input());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(404);
	});

	it("403 si non-membre", async () => {
		p.campaign.findFirst.mockResolvedValue({ ownerId: OTHER } as unknown);
		p.campaignMember.findFirst.mockResolvedValue(null as unknown);
		const r = await postMessageHandler(input());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(403);
	});

	it("201 pour le propriétaire : persiste et publie", async () => {
		p.campaign.findFirst.mockResolvedValue({ ownerId: OWNER } as unknown);
		const r = await postMessageHandler(input());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.message.content).toBe("Bonjour");
		expect(p.message.create).toHaveBeenCalledTimes(1);
		expect(publish).toHaveBeenCalledTimes(1);
	});

	it("201 pour un membre actif", async () => {
		p.campaign.findFirst.mockResolvedValue({ ownerId: OTHER } as unknown);
		p.campaignMember.findFirst.mockResolvedValue({ id: "mem1" } as unknown);
		const r = await postMessageHandler(input());
		expect(r.ok).toBe(true);
	});
});
