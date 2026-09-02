import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	campaign: {
		findFirst: mock(async () => null as unknown),
	},
	campaignMember: {
		findFirst: mock(async () => null as unknown),
	},
	characterSheet: {
		findFirst: mock(async () => null as unknown),
		findUnique: mock(async () => null as unknown),
		findUniqueOrThrow: mock(
			async () =>
				({
					id: "55555555-5555-5555-5555-555555555555",
					userId: "22222222-2222-2222-2222-222222222222",
					gameSystemId: "33333333-3333-3333-3333-333333333333",
					name: "Aragorn",
					avatarFileId: null,
					gold: null,
					abilityMethod: null,
					values: [],
					selections: [],
				}) as unknown,
		),
		create: mock(async () => ({}) as unknown),
	},
	characterSheetValue: {
		createMany: mock(async () => ({ count: 0 }) as unknown),
	},
	characterSheetSelection: {
		createMany: mock(async () => ({ count: 0 }) as unknown),
	},
	campaignCharacterSheet: {
		findFirst: mock(async () => null as unknown),
		findUnique: mock(async () => null as unknown),
		findMany: mock(async () => [] as unknown[]),
		create: mock(async () => ({}) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	gameSystem: {
		findUnique: mock(async () => null as unknown),
	},
	$transaction: mock(async (arg: unknown) => {
		if (typeof arg === "function") {
			return (arg as (tx: unknown) => Promise<unknown>)(p);
		}
		return Promise.all(arg as Promise<unknown>[]);
	}),
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

// Redis mocké : pas de connexion réseau dans les tests.
const redisMock = {
	publish: mock(async () => 1),
	duplicate: mock(() => ({
		on: mock(() => {}),
		subscribe: mock(async () => {}),
		unsubscribe: mock(async () => {}),
		disconnect: mock(() => {}),
	})),
};
mock.module("../../lib/redis", () => ({
	redis: redisMock,
	redisConsumer: {},
}));

// Stockage objet mocké : pas d'I/O réseau dans les tests.
const uploadCampaignCover = mock(async () => "cover-key");
const getPresignedCoverUrl = mock(
	async (id: string) => `https://cdn.test/${id}/cover`,
);
mock.module("../../lib/cover-storage", () => ({
	uploadCampaignCover,
	getPresignedCoverUrl,
	coverObjectKey: (id: string) => `${id}/cover`,
}));

const { campaignsController } =
	require("../campaigns.controller") as typeof import("../campaigns.controller");

const OWNER = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";
const OUTSIDER = "99999999-9999-9999-9999-999999999999";
const GS = "33333333-3333-3333-3333-333333333333";
const GS_CHILD = "3c3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c";
const GS_OTHER = "30303030-3030-3030-3030-303030303030";
const CID = "44444444-4444-4444-4444-444444444444";
const SHEET = "55555555-5555-5555-5555-555555555555";
const LINK = "66666666-6666-6666-6666-666666666666";

type CallOpts = { userId?: string; role?: string; body?: unknown };

async function call(method: string, path: string, opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	if (opts.role) headers["x-user-role"] = opts.role;
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers["content-type"] = "application/json";
		body = JSON.stringify(opts.body);
	}
	const res = await campaignsController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

function activeCampaign(extra: Record<string, unknown> = {}) {
	return {
		id: CID,
		ownerId: OWNER,
		gameSystemId: GS,
		nom: "Camp",
		description: null,
		isPublic: true,
		status: "active",
		tags: [],
		coverFileId: null,
		characterCreationLocked: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		...extra,
	};
}

function sheet(extra: Record<string, unknown> = {}) {
	return {
		id: SHEET,
		userId: PLAYER,
		gameSystemId: GS,
		name: "Aragorn",
		deletedAt: null,
		...extra,
	};
}

/** Membre actif jouant un rôle donné. */
function member(role: string, extra: Record<string, unknown> = {}) {
	return { id: "m1", campaignId: CID, role, leftAt: null, ...extra };
}

beforeEach(() => {
	for (const model of Object.values(p)) {
		if (typeof model === "function") {
			(model as ReturnType<typeof mock>).mockReset();
			continue;
		}
		for (const fn of Object.values(model as Record<string, unknown>)) {
			(fn as ReturnType<typeof mock>).mockReset();
		}
	}
	p.campaign.findFirst.mockResolvedValue(null as unknown);
	p.campaignMember.findFirst.mockResolvedValue(null as unknown);
	p.characterSheet.findFirst.mockResolvedValue(null as unknown);
	p.characterSheet.findUnique.mockResolvedValue(null as unknown);
	p.characterSheet.findUniqueOrThrow.mockResolvedValue({
		id: SHEET,
		userId: PLAYER,
		gameSystemId: GS,
		name: "Aragorn",
		avatarFileId: null,
		gold: null,
		abilityMethod: null,
		values: [],
		selections: [],
	} as unknown);
	p.characterSheet.create.mockResolvedValue({} as unknown);
	p.characterSheetValue.createMany.mockResolvedValue({ count: 0 } as unknown);
	p.characterSheetSelection.createMany.mockResolvedValue({
		count: 0,
	} as unknown);
	p.campaignCharacterSheet.findFirst.mockResolvedValue(null as unknown);
	p.campaignCharacterSheet.findUnique.mockResolvedValue(null as unknown);
	p.campaignCharacterSheet.findMany.mockResolvedValue([] as unknown);
	p.campaignCharacterSheet.create.mockResolvedValue({ id: LINK } as unknown);
	p.campaignCharacterSheet.delete.mockResolvedValue({} as unknown);
	p.gameSystem.findUnique.mockResolvedValue(null as unknown);
	p.$transaction.mockImplementation(async (arg: unknown) => {
		if (typeof arg === "function") {
			return (arg as (tx: unknown) => Promise<unknown>)(p);
		}
		return Promise.all(arg as Promise<unknown>[]);
	});
});

// ==================== FEAT-178 : importer une fiche ====================

describe("POST /campaigns/:id/character-sheets/:sheetId (FEAT-178)", () => {
	it("sans auth (401)", async () => {
		const r = await call("POST", `/campaigns/${CID}/character-sheets/${SHEET}`);
		expect(r.status).toBe(401);
	});

	it("campagne introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(404);
	});

	it("fiche introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(404);
	});

	it("fiche d'un autre utilisateur (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue(
			sheet({ userId: OUTSIDER }) as unknown,
		);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(403);
	});

	it("utilisateur non membre (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue(sheet() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(403);
	});

	it("système incompatible (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ gameSystemId: GS }) as unknown,
		);
		p.characterSheet.findFirst.mockResolvedValue(
			sheet({ gameSystemId: GS_OTHER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.gameSystem.findUnique.mockResolvedValue({
			id: GS_OTHER,
			parentSystemId: null,
		} as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(409);
	});

	it("compatibilité parent/enfant acceptée (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ gameSystemId: GS }) as unknown,
		);
		p.characterSheet.findFirst.mockResolvedValue(
			sheet({ gameSystemId: GS_CHILD }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		// La fiche utilise un fork dont le parent est le système de la campagne.
		p.gameSystem.findUnique.mockResolvedValue({
			id: GS_CHILD,
			parentSystemId: GS,
		} as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(201);
		expect(p.campaignCharacterSheet.create).toHaveBeenCalled();
	});

	it("même système (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue(sheet() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		expect(r.json?.id).toBe(LINK);
	});

	it("doublon (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue(sheet() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.create.mockRejectedValue({ code: "P2002" });
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(409);
	});

	it("campagne archivée (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ status: "archived" }) as unknown,
		);
		p.characterSheet.findFirst.mockResolvedValue(sheet() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{
				userId: PLAYER,
			},
		);
		expect(r.status).toBe(409);
	});
});

// ==================== FEAT-179 : fiches liées ====================

describe("GET /campaigns/:id/character-sheets (FEAT-179)", () => {
	it("sans auth (401)", async () => {
		const r = await call("GET", `/campaigns/${CID}/character-sheets`);
		expect(r.status).toBe(401);
	});

	it("campagne introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(null as unknown);
		const r = await call("GET", `/campaigns/${CID}/character-sheets`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(404);
	});

	it("non membre (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(null as unknown);
		const r = await call("GET", `/campaigns/${CID}/character-sheets`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(403);
	});

	it("le MJ voit toutes les fiches (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("gm") as unknown);
		p.campaignCharacterSheet.findMany.mockResolvedValue([
			{
				id: LINK,
				characterSheetId: SHEET,
				status: "inactive",
				characterSheet: { userId: PLAYER, name: "Aragorn" },
			},
			{
				id: "77777777-7777-7777-7777-777777777777",
				characterSheetId: "88888888-8888-8888-8888-888888888888",
				status: "active",
				characterSheet: { userId: OUTSIDER, name: "Legolas" },
			},
		] as unknown);
		const r = await call("GET", `/campaigns/${CID}/character-sheets`, {
			userId: OWNER,
		});
		expect(r.status).toBe(200);
		expect((r.json?.sheets as unknown[]).length).toBe(2);
		// Pas de filtre par utilisateur côté requête pour le MJ.
		const where = (
			p.campaignCharacterSheet.findMany.mock.calls[0]?.[0] as {
				where: Record<string, unknown>;
			}
		).where;
		expect(where.characterSheet).toBeUndefined();
	});

	it("un joueur ne voit que sa fiche (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.findMany.mockResolvedValue([
			{
				id: LINK,
				characterSheetId: SHEET,
				status: "active",
				characterSheet: { userId: PLAYER, name: "Aragorn" },
			},
		] as unknown);
		const r = await call("GET", `/campaigns/${CID}/character-sheets`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(200);
		const sheets = r.json?.sheets as Record<string, unknown>[];
		expect(sheets.length).toBe(1);
		expect(sheets[0].userId).toBe(PLAYER);
		expect(sheets[0].name).toBe("Aragorn");
		// Le joueur filtre sur ses propres fiches.
		const where = (
			p.campaignCharacterSheet.findMany.mock.calls[0]?.[0] as {
				where: { characterSheet?: { userId?: string } };
			}
		).where;
		expect(where.characterSheet?.userId).toBe(PLAYER);
	});
});

// ==================== FEAT-180 : retirer une fiche ====================

describe("DELETE /campaigns/:id/character-sheets/:sheetId (FEAT-180)", () => {
	it("sans auth (401)", async () => {
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
		);
		expect(r.status).toBe(401);
	});

	it("campagne introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(404);
	});

	it("lien introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("gm") as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{ userId: OWNER },
		);
		expect(r.status).toBe(404);
	});

	it("ni propriétaire de la fiche ni MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue({
			id: LINK,
			characterSheetId: SHEET,
			characterSheet: { userId: OUTSIDER },
		} as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("propriétaire de la fiche retire le lien (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue({
			id: LINK,
			characterSheetId: SHEET,
			characterSheet: { userId: PLAYER },
		} as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(200);
		expect(p.campaignCharacterSheet.delete).toHaveBeenCalled();
	});

	it("le MJ retire le lien d'une autre fiche (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("gm") as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue({
			id: LINK,
			characterSheetId: SHEET,
			characterSheet: { userId: PLAYER },
		} as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/character-sheets/${SHEET}`,
			{ userId: OWNER },
		);
		expect(r.status).toBe(200);
		expect(p.campaignCharacterSheet.delete).toHaveBeenCalledWith({
			where: { id: LINK },
		});
	});
});
