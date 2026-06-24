import { beforeEach, describe, expect, it, mock } from "bun:test";

const p = {
	sessionToken: {
		findUnique: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
		delete: mock(async () => ({}) as unknown),
		findMany: mock(async () => [] as unknown[]),
	},
	session: { findUnique: mock(async () => null as unknown) },
	campaign: { findFirst: mock(async () => null as unknown) },
	campaignMember: { findFirst: mock(async () => null as unknown) },
};
mock.module("../../lib/prisma", () => ({ prisma: p }));

const { parseTokenCommand, handleTokenCommand } =
	require("../session-tokens") as typeof import("../session-tokens");

const SID = "55555555-5555-5555-5555-555555555555";
const CID = "44444444-4444-4444-4444-444444444444";
const TID = "33333333-3333-3333-3333-333333333333";
const OWNER = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";

describe("parseTokenCommand", () => {
	it("parse TOKEN_MOVE valide", () => {
		expect(
			parseTokenCommand({ type: "TOKEN_MOVE", tokenId: TID, x: 3, y: 5 }),
		).toEqual({
			type: "TOKEN_MOVE",
			tokenId: TID,
			x: 3,
			y: 5,
		});
	});

	it("rejette TOKEN_MOVE sans coordonnées", () => {
		expect(parseTokenCommand({ type: "TOKEN_MOVE", tokenId: TID })).toBeNull();
	});

	it("parse TOKEN_REMOVE valide", () => {
		expect(parseTokenCommand({ type: "TOKEN_REMOVE", tokenId: TID })).toEqual({
			type: "TOKEN_REMOVE",
			tokenId: TID,
		});
	});

	it("parse TOKEN_UPDATE valide", () => {
		expect(
			parseTokenCommand({
				type: "TOKEN_UPDATE",
				tokenId: TID,
				isVisible: false,
			}),
		).toEqual({
			type: "TOKEN_UPDATE",
			tokenId: TID,
			isVisible: false,
		});
	});

	it("rejette les types inconnus", () => {
		expect(parseTokenCommand({ type: "UNKNOWN" })).toBeNull();
	});
});

describe("handleTokenCommand — TOKEN_MOVE", () => {
	beforeEach(() => {
		p.session.findUnique.mockResolvedValue({ id: SID, campaignId: CID });
		p.campaign.findFirst.mockResolvedValue({
			id: CID,
			ownerId: OWNER,
			nom: "C",
			deletedAt: null,
		});
		p.campaignMember.findFirst.mockResolvedValue(null);
		p.sessionToken.findUnique.mockResolvedValue({ id: TID, sessionId: SID });
		p.sessionToken.update.mockResolvedValue({
			id: TID,
			posX: 3,
			posY: 5,
			sessionId: SID,
		});
	});

	it("déplace un token et retourne TOKEN_MOVED", async () => {
		const evt = await handleTokenCommand(SID, OWNER, {
			type: "TOKEN_MOVE",
			tokenId: TID,
			x: 3,
			y: 5,
		});
		expect(evt?.type).toBe("TOKEN_MOVED");
		expect(p.sessionToken.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: TID },
				data: expect.objectContaining({ posX: 3, posY: 5 }),
			}),
		);
	});

	it("refuse un non-membre", async () => {
		p.session.findUnique.mockResolvedValue(null);
		const evt = await handleTokenCommand(SID, PLAYER, {
			type: "TOKEN_MOVE",
			tokenId: TID,
			x: 1,
			y: 1,
		});
		expect(evt).toBeNull();
	});

	it("retourne null si le token n'existe pas", async () => {
		p.sessionToken.findUnique.mockResolvedValue(null);
		const evt = await handleTokenCommand(SID, OWNER, {
			type: "TOKEN_MOVE",
			tokenId: TID,
			x: 1,
			y: 1,
		});
		expect(evt).toBeNull();
	});
});

describe("handleTokenCommand — TOKEN_REMOVE", () => {
	beforeEach(() => {
		p.session.findUnique.mockResolvedValue({ id: SID, campaignId: CID });
		p.campaign.findFirst.mockResolvedValue({
			id: CID,
			ownerId: OWNER,
			nom: "C",
			deletedAt: null,
		});
		p.campaignMember.findFirst.mockResolvedValue(null);
		p.sessionToken.findUnique.mockResolvedValue({ id: TID, sessionId: SID });
		p.sessionToken.delete.mockResolvedValue({ id: TID });
	});

	it("supprime un token et retourne TOKEN_REMOVED", async () => {
		const evt = await handleTokenCommand(SID, OWNER, {
			type: "TOKEN_REMOVE",
			tokenId: TID,
		});
		expect(evt?.type).toBe("TOKEN_REMOVED");
		expect(p.sessionToken.delete).toHaveBeenCalledWith({ where: { id: TID } });
	});

	it("retourne null si le token n'existe pas", async () => {
		p.sessionToken.findUnique.mockResolvedValue(null);
		const evt = await handleTokenCommand(SID, OWNER, {
			type: "TOKEN_REMOVE",
			tokenId: TID,
		});
		expect(evt).toBeNull();
	});
});

describe("handleTokenCommand — TOKEN_UPDATE", () => {
	beforeEach(() => {
		p.session.findUnique.mockResolvedValue({ id: SID, campaignId: CID });
		p.campaign.findFirst.mockResolvedValue({
			id: CID,
			ownerId: OWNER,
			nom: "C",
			deletedAt: null,
		});
		p.campaignMember.findFirst.mockResolvedValue(null);
		p.sessionToken.findUnique.mockResolvedValue({ id: TID, sessionId: SID });
		p.sessionToken.update.mockResolvedValue({
			id: TID,
			sessionId: SID,
			updatedAt: new Date(),
		});
	});

	it("met à jour un token et retourne TOKEN_UPDATED", async () => {
		const evt = await handleTokenCommand(SID, OWNER, {
			type: "TOKEN_UPDATE",
			tokenId: TID,
			isVisible: false,
		});
		expect(evt?.type).toBe("TOKEN_UPDATED");
		expect(p.sessionToken.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: TID } }),
		);
	});

	it("retourne null si le token n'existe pas", async () => {
		p.sessionToken.findUnique.mockResolvedValue(null);
		const evt = await handleTokenCommand(SID, OWNER, {
			type: "TOKEN_UPDATE",
			tokenId: TID,
			isVisible: true,
		});
		expect(evt).toBeNull();
	});
});
