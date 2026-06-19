import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	characterSheet: {
		findUnique: mock(async () => null as unknown),
		update: mock(async () => ({}) as unknown),
	},
	file: { create: mock(async () => ({}) as unknown) },
	$transaction: mock(async (ops: Promise<unknown>[]) => Promise.all(ops)),
};
mock.module("../../../lib/prisma", () => ({ prisma: p }));

const uploadCharacterAvatar = mock(async () => "avatar-key");
const getPresignedAvatarUrl = mock(async () => "https://cdn.test/avatar");
mock.module("../../../lib/avatar-storage", () => ({
	uploadCharacterAvatar,
	getPresignedAvatarUrl,
	avatarObjectKey: (id: string) => `${id}/avatar`,
}));

const { uploadAvatarHandler, isAllowedAvatarType, MAX_AVATAR_SIZE_BYTES } =
	require("./upload-avatar.handler") as typeof import("./upload-avatar.handler");

const SHEET = "44444444-4444-4444-4444-444444444444";
const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function sheet(extra: Record<string, unknown> = {}) {
	return { id: SHEET, userId: OWNER, deletedAt: null, ...extra };
}

function input(extra: Partial<Parameters<typeof uploadAvatarHandler>[0]> = {}) {
	return {
		sheetId: SHEET,
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
	p.characterSheet.update.mockResolvedValue({} as unknown);
	p.file.create.mockResolvedValue({} as unknown);
	uploadCharacterAvatar.mockReset();
	uploadCharacterAvatar.mockResolvedValue("avatar-key");
	getPresignedAvatarUrl.mockReset();
	getPresignedAvatarUrl.mockResolvedValue("https://cdn.test/avatar");
});

describe("isAllowedAvatarType", () => {
	it("accepte JPEG, PNG, WebP", () => {
		expect(isAllowedAvatarType("image/jpeg")).toBe(true);
		expect(isAllowedAvatarType("image/png")).toBe(true);
		expect(isAllowedAvatarType("image/webp")).toBe(true);
	});
	it("refuse les autres types", () => {
		expect(isAllowedAvatarType("application/pdf")).toBe(false);
		expect(isAllowedAvatarType("image/gif")).toBe(false);
	});
});

describe("uploadAvatarHandler", () => {
	it("404 si fiche introuvable", async () => {
		p.characterSheet.findUnique.mockResolvedValue(null as unknown);
		const r = await uploadAvatarHandler(input());
		expect(r).toEqual({ ok: false, status: 404, error: expect.any(String) });
	});

	it("404 si fiche supprimée", async () => {
		p.characterSheet.findUnique.mockResolvedValue(
			sheet({ deletedAt: new Date() }) as unknown,
		);
		const r = await uploadAvatarHandler(input());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(404);
	});

	it("403 si non propriétaire", async () => {
		p.characterSheet.findUnique.mockResolvedValue(sheet() as unknown);
		const r = await uploadAvatarHandler(input({ userId: OTHER }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(403);
	});

	it("400 si type non autorisé", async () => {
		p.characterSheet.findUnique.mockResolvedValue(sheet() as unknown);
		const r = await uploadAvatarHandler(input({ contentType: "image/gif" }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("400 si trop volumineux", async () => {
		p.characterSheet.findUnique.mockResolvedValue(sheet() as unknown);
		const r = await uploadAvatarHandler(
			input({ data: Buffer.alloc(MAX_AVATAR_SIZE_BYTES + 1) }),
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.status).toBe(400);
	});

	it("201 succès : upload + File + avatarFileId", async () => {
		p.characterSheet.findUnique.mockResolvedValue(sheet() as unknown);
		const r = await uploadAvatarHandler(input());
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(typeof r.fileId).toBe("string");
			expect(r.avatarUrl).toBe("https://cdn.test/avatar");
		}
		expect(uploadCharacterAvatar).toHaveBeenCalledTimes(1);
		expect(p.file.create).toHaveBeenCalledTimes(1);
		expect(p.characterSheet.update).toHaveBeenCalledTimes(1);
	});

	it("succès même si l'URL présignée échoue (avatarUrl null)", async () => {
		p.characterSheet.findUnique.mockResolvedValue(sheet() as unknown);
		getPresignedAvatarUrl.mockRejectedValue(new Error("storage down"));
		const r = await uploadAvatarHandler(input());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.avatarUrl).toBeNull();
	});
});
