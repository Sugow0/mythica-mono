import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	campaign: {
		findFirst: mock(async () => null as unknown),
		update: mock(async () => ({}) as unknown),
	},
	file: { create: mock(async () => ({}) as unknown) },
	$transaction: mock(async (ops: Promise<unknown>[]) => Promise.all(ops)),
};
mock.module("../../../lib/prisma", () => ({ prisma: p }));

const uploadCampaignCover = mock(async () => "cover-key");
const getPresignedCoverUrl = mock(async () => "https://cdn.test/cover");
mock.module("../../../lib/cover-storage", () => ({
	uploadCampaignCover,
	getPresignedCoverUrl,
	coverObjectKey: (id: string) => `${id}/cover`,
}));

const { uploadCoverHandler, isAllowedCoverType, MAX_COVER_SIZE_BYTES } =
	require("./upload-cover.handler") as typeof import("./upload-cover.handler");

const CID = "44444444-4444-4444-4444-444444444444";
const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function campaign(extra: Record<string, unknown> = {}) {
	return { id: CID, ownerId: OWNER, isPublic: true, ...extra };
}

function input(extra: Partial<Parameters<typeof uploadCoverHandler>[0]> = {}) {
	return {
		campaignId: CID,
		userId: OWNER,
		data: Buffer.alloc(1024),
		contentType: "image/png",
		...extra,
	};
}

beforeEach(() => {
	for (const model of Object.values(p)) {
		if (typeof model === "function") {
			(model as ReturnType<typeof mock>).mockReset();
			continue;
		}
		for (const fn of Object.values(model)) {
			(fn as ReturnType<typeof mock>).mockReset();
		}
	}
	p.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
		Promise.all(ops),
	);
	p.campaign.update.mockResolvedValue({} as unknown);
	p.file.create.mockResolvedValue({} as unknown);
	uploadCampaignCover.mockReset();
	uploadCampaignCover.mockResolvedValue("cover-key");
	getPresignedCoverUrl.mockReset();
	getPresignedCoverUrl.mockResolvedValue("https://cdn.test/cover");
});

describe("isAllowedCoverType", () => {
	it("accepte JPEG, PNG, WebP", () => {
		expect(isAllowedCoverType("image/jpeg")).toBe(true);
		expect(isAllowedCoverType("image/png")).toBe(true);
		expect(isAllowedCoverType("image/webp")).toBe(true);
	});
	it("refuse les autres types", () => {
		expect(isAllowedCoverType("application/pdf")).toBe(false);
		expect(isAllowedCoverType("image/gif")).toBe(false);
	});
});

describe("uploadCoverHandler", () => {
	it("404 si campagne introuvable", async () => {
		p.campaign.findFirst.mockResolvedValue(null as unknown);
		const r = await uploadCoverHandler(input());
		expect(r).toEqual({ ok: false, status: 404, error: expect.any(String) });
	});

	it("403 si non propriétaire", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await uploadCoverHandler(input({ userId: OTHER }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(403);
	});

	it("400 si type non autorisé", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await uploadCoverHandler(input({ contentType: "image/gif" }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("400 si trop volumineux", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await uploadCoverHandler(
			input({ data: Buffer.alloc(MAX_COVER_SIZE_BYTES + 1) }),
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("201 succès : upload + File + coverFileId", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await uploadCoverHandler(input());
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(typeof r.fileId).toBe("string");
			expect(r.coverUrl).toBe("https://cdn.test/cover");
		}
		expect(uploadCampaignCover).toHaveBeenCalledTimes(1);
		expect(p.file.create).toHaveBeenCalledTimes(1);
		expect(p.campaign.update).toHaveBeenCalledTimes(1);
	});

	it("succès même si l'URL présignée échoue (coverUrl null)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		getPresignedCoverUrl.mockRejectedValue(new Error("storage down"));
		const r = await uploadCoverHandler(input());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.coverUrl).toBeNull();
	});
});
