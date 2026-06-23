import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS =====

const p = {
	campaign: { findFirst: mock(async () => null as unknown) },
	campaignMember: { findFirst: mock(async () => null as unknown) },
	characterSheet: {
		findFirst: mock(async () => null as unknown),
		findUniqueOrThrow: mock(
			async () =>
				({
					id: SHEET,
					userId: GM,
					gameSystemId: GS,
					name: "Thorin",
					avatarFileId: null,
					gold: null,
					abilityMethod: null,
					values: [],
					selections: [],
				}) as unknown,
		),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
	},
	characterSheetValue: {
		createMany: mock(async () => ({ count: 0 }) as unknown),
	},
	characterSheetSelection: {
		createMany: mock(async () => ({ count: 0 }) as unknown),
	},
	campaignCharacterSheet: {
		findFirst: mock(async () => null as unknown),
		findMany: mock(async () => [] as unknown[]),
		create: mock(async () => ({ id: LINK }) as unknown),
		update: mock(async () => ({}) as unknown),
		updateMany: mock(async () => ({ count: 1 }) as unknown),
	},
	campaignPoolSheet: {
		findFirst: mock(async () => null as unknown),
		findMany: mock(async () => [] as unknown[]),
		create: mock(async () => ({ id: POOL_ID }) as unknown),
		updateMany: mock(async () => ({ count: 1 }) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	campaignPoolRequest: {
		findFirst: mock(async () => null as unknown),
		findMany: mock(async () => [] as unknown[]),
		create: mock(async () => ({ id: REQ_ID }) as unknown),
		update: mock(async () => ({}) as unknown),
		updateMany: mock(async () => ({ count: 1 }) as unknown),
	},
	campaignCharacterChangeRequest: {
		findFirst: mock(async () => null as unknown),
		findMany: mock(async () => [] as unknown[]),
		create: mock(async () => ({ id: CHANGE_REQ_ID }) as unknown),
		update: mock(async () => ({}) as unknown),
		updateMany: mock(async () => ({ count: 1 }) as unknown),
	},
	gameSystem: { findUnique: mock(async () => null as unknown) },
	$transaction: mock(async (arg: unknown) => {
		if (typeof arg === "function")
			return (arg as (tx: unknown) => Promise<unknown>)(p);
		return Promise.all(arg as Promise<unknown>[]);
	}),
};

mock.module("../../lib/prisma", () => ({ prisma: p }));
mock.module("../../lib/redis", () => ({
	redis: {
		publish: mock(async () => 1),
		duplicate: mock(() => ({
			on: mock(() => {}),
			subscribe: mock(async () => {}),
			unsubscribe: mock(async () => {}),
			disconnect: mock(() => {}),
		})),
	},
	redisConsumer: {},
}));
mock.module("../../lib/cover-storage", () => ({
	uploadCampaignCover: mock(async () => "key"),
	getPresignedCoverUrl: mock(
		async (id: string) => `https://cdn.test/${id}/cover`,
	),
	coverObjectKey: (id: string) => `${id}/cover`,
}));

const { campaignCharacterSheetsController } =
	require("../campaign-character-sheets.controller") as typeof import("../campaign-character-sheets.controller");

const GM = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";
const OUTSIDER = "99999999-9999-9999-9999-999999999999";
const GS = "33333333-3333-3333-3333-333333333333";
const CID = "44444444-4444-4444-4444-444444444444";
const SHEET = "55555555-5555-5555-5555-555555555555";
const LINK = "66666666-6666-6666-6666-666666666666";
const POOL_ID = "77777777-7777-7777-7777-777777777777";
const POOL_ID2 = "88888888-8888-8888-8888-000000000000";
const REQ_ID = "88888888-8888-8888-8888-888888888888";
const CHANGE_REQ_ID = "99999999-aaaa-bbbb-cccc-dddddddddddd";
const SHEET2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

async function call(
	method: string,
	path: string,
	opts: { userId?: string; body?: unknown } = {},
) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers["content-type"] = "application/json";
		body = JSON.stringify(opts.body);
	}
	const res = await campaignCharacterSheetsController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

function campaign(extra: Record<string, unknown> = {}) {
	return {
		id: CID,
		ownerId: GM,
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
function member(role: string) {
	return { id: "m1", campaignId: CID, role, leftAt: null };
}
function poolSheet(extra: Record<string, unknown> = {}) {
	return {
		id: POOL_ID,
		campaignId: CID,
		characterSheetId: SHEET,
		visibleToPlayers: true,
		characterSheet: { name: "Thorin" },
		requests: [],
		...extra,
	};
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
	p.characterSheet.findUniqueOrThrow.mockResolvedValue({
		id: SHEET,
		userId: GM,
		gameSystemId: GS,
		name: "Thorin",
		avatarFileId: null,
		gold: null,
		abilityMethod: null,
		values: [],
		selections: [],
	} as unknown);
	p.characterSheet.create.mockResolvedValue({} as unknown);
	p.characterSheet.update.mockResolvedValue({} as unknown);
	p.characterSheetValue.createMany.mockResolvedValue({ count: 0 } as unknown);
	p.characterSheetSelection.createMany.mockResolvedValue({
		count: 0,
	} as unknown);
	p.campaignCharacterSheet.findFirst.mockResolvedValue(null as unknown);
	p.campaignCharacterSheet.findMany.mockResolvedValue([] as unknown);
	p.campaignCharacterSheet.create.mockResolvedValue({ id: LINK } as unknown);
	p.campaignCharacterSheet.update.mockResolvedValue({} as unknown);
	p.campaignCharacterSheet.updateMany.mockResolvedValue({
		count: 1,
	} as unknown);
	p.campaignPoolSheet.findFirst.mockResolvedValue(null as unknown);
	p.campaignPoolSheet.findMany.mockResolvedValue([] as unknown);
	p.campaignPoolSheet.create.mockResolvedValue({ id: POOL_ID } as unknown);
	p.campaignPoolSheet.updateMany.mockResolvedValue({ count: 1 } as unknown);
	p.campaignPoolSheet.delete.mockResolvedValue({} as unknown);
	p.campaignPoolRequest.findFirst.mockResolvedValue(null as unknown);
	p.campaignPoolRequest.findMany.mockResolvedValue([] as unknown);
	p.campaignPoolRequest.create.mockResolvedValue({ id: REQ_ID } as unknown);
	p.campaignPoolRequest.update.mockResolvedValue({} as unknown);
	p.campaignPoolRequest.updateMany.mockResolvedValue({ count: 1 } as unknown);
	p.campaignCharacterChangeRequest.findFirst.mockResolvedValue(null as unknown);
	p.campaignCharacterChangeRequest.findMany.mockResolvedValue([] as unknown);
	p.campaignCharacterChangeRequest.create.mockResolvedValue({
		id: CHANGE_REQ_ID,
	} as unknown);
	p.campaignCharacterChangeRequest.update.mockResolvedValue({} as unknown);
	p.campaignCharacterChangeRequest.updateMany.mockResolvedValue({
		count: 1,
	} as unknown);
	p.gameSystem.findUnique.mockResolvedValue(null as unknown);
	p.$transaction.mockImplementation(async (arg: unknown) => {
		if (typeof arg === "function")
			return (arg as (tx: unknown) => Promise<unknown>)(p);
		return Promise.all(arg as Promise<unknown>[]);
	});
});

// ==================== IMPORT JOUEUR ====================

describe("POST /campaigns/:id/character-sheets/import", () => {
	it("sans auth (401)", async () => {
		const r = await call("POST", `/campaigns/${CID}/character-sheets/import`, {
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(401);
	});

	it("campagne introuvable (404)", async () => {
		const r = await call("POST", `/campaigns/${CID}/character-sheets/import`, {
			userId: PLAYER,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(404);
	});

	it("campagne verrouillée (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ characterCreationLocked: true }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call("POST", `/campaigns/${CID}/character-sheets/import`, {
			userId: PLAYER,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(403);
	});

	it("non membre (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(null as unknown);
		const r = await call("POST", `/campaigns/${CID}/character-sheets/import`, {
			userId: PLAYER,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(403);
	});

	it("fiche source introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.characterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call("POST", `/campaigns/${CID}/character-sheets/import`, {
			userId: PLAYER,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(404);
	});

	it("import réussi (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.characterSheet.findFirst.mockResolvedValue({
			id: SHEET,
			userId: PLAYER,
			gameSystemId: GS,
			deletedAt: null,
		} as unknown);
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
		const r = await call("POST", `/campaigns/${CID}/character-sheets/import`, {
			userId: PLAYER,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		expect(p.campaignCharacterSheet.create).toHaveBeenCalled();
	});
});

// ==================== CREATE DEPUIS WIZARD ====================

describe("POST /campaigns/:id/character-sheets/create", () => {
	it("sans auth (401)", async () => {
		const r = await call("POST", `/campaigns/${CID}/character-sheets/create`, {
			body: { characterSheetId: SHEET },
		});
		expect(r.status).toBe(401);
	});

	it("campagne verrouillée (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ characterCreationLocked: true }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call("POST", `/campaigns/${CID}/character-sheets/create`, {
			userId: PLAYER,
			body: { characterSheetId: SHEET },
		});
		expect(r.status).toBe(403);
	});

	it("fiche master introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.characterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call("POST", `/campaigns/${CID}/character-sheets/create`, {
			userId: PLAYER,
			body: { characterSheetId: SHEET },
		});
		expect(r.status).toBe(404);
	});

	it("création réussie (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.characterSheet.findFirst.mockResolvedValue({
			id: SHEET,
			userId: PLAYER,
			gameSystemId: GS,
			deletedAt: null,
		} as unknown);
		const r = await call("POST", `/campaigns/${CID}/character-sheets/create`, {
			userId: PLAYER,
			body: { characterSheetId: SHEET },
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
	});
});

// ==================== ACTIVATION ====================

describe("POST /campaigns/:id/character-sheets/:campaignSheetId/activate", () => {
	it("sans auth (401)", async () => {
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${LINK}/activate`,
		);
		expect(r.status).toBe(401);
	});

	it("campagne verrouillée (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ characterCreationLocked: true }) as unknown,
		);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${LINK}/activate`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("fiche introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${LINK}/activate`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(404);
	});

	it("fiche non inactive (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst
			.mockResolvedValueOnce({
				id: LINK,
				status: "active",
				characterSheet: { userId: PLAYER },
			} as unknown)
			.mockResolvedValueOnce(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${LINK}/activate`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(409);
	});

	it("déjà une fiche active (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst
			.mockResolvedValueOnce({
				id: LINK,
				status: "inactive",
				characterSheet: { userId: PLAYER },
			} as unknown)
			.mockResolvedValueOnce({ id: "other", status: "active" } as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${LINK}/activate`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(409);
	});

	it("activation réussie (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst
			.mockResolvedValueOnce({
				id: LINK,
				status: "inactive",
				characterSheet: { userId: PLAYER },
			} as unknown)
			.mockResolvedValueOnce(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/${LINK}/activate`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(200);
		expect(p.campaignCharacterSheet.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "active" } }),
		);
	});
});

// ==================== DEMANDE DE CHANGEMENT ====================

describe("POST /campaigns/:id/character-sheets/change-request", () => {
	it("pas de fiche active (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.findFirst
			.mockResolvedValueOnce(null as unknown) // pas de fiche active
			.mockResolvedValueOnce({ id: LINK, status: "inactive" } as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-request`,
			{
				userId: PLAYER,
				body: { targetCampaignSheetId: LINK },
			},
		);
		expect(r.status).toBe(409);
	});

	it("fiche cible introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.findFirst
			.mockResolvedValueOnce({ id: "active-id", status: "active" } as unknown)
			.mockResolvedValueOnce(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-request`,
			{
				userId: PLAYER,
				body: { targetCampaignSheetId: LINK },
			},
		);
		expect(r.status).toBe(404);
	});

	it("demande créée (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignCharacterSheet.findFirst
			.mockResolvedValueOnce({ id: "active-id", status: "active" } as unknown)
			.mockResolvedValueOnce({ id: LINK, status: "inactive" } as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-request`,
			{
				userId: PLAYER,
				body: { targetCampaignSheetId: LINK },
			},
		);
		expect(r.status).toBe(201);
		expect(r.json?.id).toBe(CHANGE_REQ_ID);
	});
});

// ==================== LIST CHANGE REQUESTS ====================

describe("GET /campaigns/:id/character-sheets/change-requests", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"GET",
			`/campaigns/${CID}/character-sheets/change-requests`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("liste vide (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterChangeRequest.findMany.mockResolvedValue([] as unknown);
		const r = await call(
			"GET",
			`/campaigns/${CID}/character-sheets/change-requests`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		expect((r.json?.requests as unknown[]).length).toBe(0);
	});

	it("liste avec une demande (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterChangeRequest.findMany.mockResolvedValue([
			{
				id: CHANGE_REQ_ID,
				campaignId: CID,
				playerId: PLAYER,
				targetSheetId: LINK,
				status: "pending",
				createdAt: new Date(),
				targetSheet: { characterSheet: { name: "Groot" } },
			},
		] as unknown);
		const r = await call(
			"GET",
			`/campaigns/${CID}/character-sheets/change-requests`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		const requests = r.json?.requests as Record<string, unknown>[];
		expect(requests.length).toBe(1);
		expect(requests[0].targetSheetName).toBe("Groot");
	});
});

// ==================== APPROBATION / REJET CHANGEMENT ====================

describe("POST /campaigns/:id/character-sheets/change-requests/:requestId/approve", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-requests/${CHANGE_REQ_ID}/approve`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("demande introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterChangeRequest.findFirst.mockResolvedValue(
			null as unknown,
		);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-requests/${CHANGE_REQ_ID}/approve`,
			{ userId: GM },
		);
		expect(r.status).toBe(404);
	});

	it("approbation : ancienne active → disabled, cible → active (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterChangeRequest.findFirst.mockResolvedValue({
			id: CHANGE_REQ_ID,
			targetSheetId: LINK,
			playerId: PLAYER,
			status: "pending",
		} as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-requests/${CHANGE_REQ_ID}/approve`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		expect(p.campaignCharacterSheet.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "disabled" } }),
		);
		expect(p.campaignCharacterSheet.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "active" } }),
		);
	});
});

describe("POST /campaigns/:id/character-sheets/change-requests/:requestId/reject", () => {
	it("rejet réussi (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-requests/${CHANGE_REQ_ID}/reject`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
	});

	it("demande introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterChangeRequest.updateMany.mockResolvedValue({
			count: 0,
		} as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/character-sheets/change-requests/${CHANGE_REQ_ID}/reject`,
			{ userId: GM },
		);
		expect(r.status).toBe(404);
	});
});

// ==================== CYCLE DE VIE MJ ====================

describe("PATCH /campaigns/:id/character-sheets/:campaignSheetId/disable", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/character-sheets/${LINK}/disable`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("fiche introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/character-sheets/${LINK}/disable`,
			{ userId: GM },
		);
		expect(r.status).toBe(404);
	});

	it("désactivation réussie (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue({
			id: LINK,
			status: "active",
		} as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/character-sheets/${LINK}/disable`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		expect(p.campaignCharacterSheet.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "disabled" } }),
		);
	});

	it("déjà désactivée (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.findFirst.mockResolvedValue({
			id: LINK,
			status: "disabled",
		} as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/character-sheets/${LINK}/disable`,
			{ userId: GM },
		);
		expect(r.status).toBe(409);
	});
});

describe("PATCH /campaigns/:id/character-sheets/:campaignSheetId/reactivate", () => {
	it("réactivation réussie (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.updateMany.mockResolvedValue({
			count: 1,
		} as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/character-sheets/${LINK}/reactivate`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
	});

	it("fiche non désactivée (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignCharacterSheet.updateMany.mockResolvedValue({
			count: 0,
		} as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/character-sheets/${LINK}/reactivate`,
			{ userId: GM },
		);
		expect(r.status).toBe(404);
	});
});

// ==================== SETTINGS ====================

describe("PATCH /campaigns/:id/settings", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call("PATCH", `/campaigns/${CID}/settings`, {
			userId: PLAYER,
			body: { characterCreationLocked: true },
		});
		expect(r.status).toBe(403);
	});

	it("mise à jour réussie (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaign.findFirst.mockResolvedValue({
			...campaign(),
			update: mock(async () => ({})),
		} as unknown);
		const prismaCampaignUpdate = mock(async () => ({}));
		(p as unknown as Record<string, unknown>).campaign = {
			...p.campaign,
			update: prismaCampaignUpdate,
		};
		const r = await call("PATCH", `/campaigns/${CID}/settings`, {
			userId: GM,
			body: { characterCreationLocked: true },
		});
		expect(r.status).toBe(200);
	});
});

// ==================== POOL MJ ====================

describe("POST /campaigns/:id/pool/import", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call("POST", `/campaigns/${CID}/pool/import`, {
			userId: PLAYER,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(403);
	});

	it("fiche source introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call("POST", `/campaigns/${CID}/pool/import`, {
			userId: GM,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(404);
	});

	it("import réussi dans le pool (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.characterSheet.findFirst.mockResolvedValue({
			id: SHEET,
			userId: GM,
			gameSystemId: GS,
			deletedAt: null,
		} as unknown);
		const r = await call("POST", `/campaigns/${CID}/pool/import`, {
			userId: GM,
			body: { sourceSheetId: SHEET },
		});
		expect(r.status).toBe(201);
		expect(r.json?.id).toBe(POOL_ID);
		expect(p.campaignPoolSheet.create).toHaveBeenCalled();
	});
});

describe("GET /campaigns/:id/pool", () => {
	it("sans auth (401)", async () => {
		const r = await call("GET", `/campaigns/${CID}/pool`);
		expect(r.status).toBe(401);
	});

	it("MJ voit toutes les fiches", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignPoolSheet.findMany.mockResolvedValue([
			poolSheet({ visibleToPlayers: false }),
			poolSheet({
				id: POOL_ID2,
				characterSheetId: SHEET2,
				visibleToPlayers: true,
			}),
		] as unknown);
		const r = await call("GET", `/campaigns/${CID}/pool`, { userId: GM });
		expect(r.status).toBe(200);
		expect((r.json?.sheets as unknown[]).length).toBe(2);
		const where = (
			p.campaignPoolSheet.findMany.mock.calls[0]?.[0] as {
				where: Record<string, unknown>;
			}
		).where;
		expect(where.visibleToPlayers).toBeUndefined();
	});

	it("joueur voit uniquement les fiches visibles", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ ownerId: OUTSIDER }) as unknown,
		);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignPoolSheet.findMany.mockResolvedValue([poolSheet()] as unknown);
		const r = await call("GET", `/campaigns/${CID}/pool`, { userId: PLAYER });
		expect(r.status).toBe(200);
		const where = (
			p.campaignPoolSheet.findMany.mock.calls[0]?.[0] as {
				where: Record<string, unknown>;
			}
		).where;
		expect(where.visibleToPlayers).toBe(true);
	});
});

describe("PATCH /campaigns/:id/pool/:poolSheetId/visibility", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/pool/${POOL_ID}/visibility`,
			{
				userId: PLAYER,
				body: { visibleToPlayers: true },
			},
		);
		expect(r.status).toBe(403);
	});

	it("mise à jour réussie (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/pool/${POOL_ID}/visibility`,
			{
				userId: GM,
				body: { visibleToPlayers: true },
			},
		);
		expect(r.status).toBe(200);
	});

	it("fiche introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignPoolSheet.updateMany.mockResolvedValue({ count: 0 } as unknown);
		const r = await call(
			"PATCH",
			`/campaigns/${CID}/pool/${POOL_ID}/visibility`,
			{
				userId: GM,
				body: { visibleToPlayers: true },
			},
		);
		expect(r.status).toBe(404);
	});
});

// ==================== DEMANDE POOL ====================

describe("POST /campaigns/:id/pool/:poolSheetId/request", () => {
	it("fiche non visible (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignPoolSheet.findFirst.mockResolvedValue(null as unknown);
		const r = await call("POST", `/campaigns/${CID}/pool/${POOL_ID}/request`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(404);
	});

	it("demande créée (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignPoolSheet.findFirst.mockResolvedValue(poolSheet() as unknown);
		const r = await call("POST", `/campaigns/${CID}/pool/${POOL_ID}/request`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(201);
		expect(r.json?.id).toBe(REQ_ID);
	});

	it("doublon (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		p.campaignPoolSheet.findFirst.mockResolvedValue(poolSheet() as unknown);
		p.campaignPoolRequest.create.mockRejectedValue({
			code: "P2002",
		} as unknown);
		const r = await call("POST", `/campaigns/${CID}/pool/${POOL_ID}/request`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(409);
	});
});

describe("POST /campaigns/:id/pool/:poolSheetId/requests/:requestId/confirm", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/pool/${POOL_ID}/requests/${REQ_ID}/confirm`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("demande introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignPoolRequest.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/pool/${POOL_ID}/requests/${REQ_ID}/confirm`,
			{ userId: GM },
		);
		expect(r.status).toBe(404);
	});

	it("confirmation (non verrouillée) → fiche inactive (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ characterCreationLocked: false }) as unknown,
		);
		p.campaignPoolRequest.findFirst.mockResolvedValue({
			id: REQ_ID,
			requestedByUserId: PLAYER,
			status: "pending",
			poolSheet: { characterSheetId: SHEET },
		} as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/pool/${POOL_ID}/requests/${REQ_ID}/confirm`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		const createCall = p.campaignCharacterSheet.create.mock.calls[0]?.[0] as {
			data: { status: string };
		};
		expect(createCall?.data?.status).toBe("inactive");
	});

	it("confirmation (verrouillée) → fiche active (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			campaign({ characterCreationLocked: true }) as unknown,
		);
		p.campaignPoolRequest.findFirst.mockResolvedValue({
			id: REQ_ID,
			requestedByUserId: PLAYER,
			status: "pending",
			poolSheet: { characterSheetId: SHEET },
		} as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/pool/${POOL_ID}/requests/${REQ_ID}/confirm`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		const createCall = p.campaignCharacterSheet.create.mock.calls[0]?.[0] as {
			data: { status: string };
		};
		expect(createCall?.data?.status).toBe("active");
	});
});

describe("POST /campaigns/:id/pool/:poolSheetId/requests/:requestId/reject", () => {
	it("rejet réussi (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/pool/${POOL_ID}/requests/${REQ_ID}/reject`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
	});

	it("demande introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignPoolRequest.updateMany.mockResolvedValue({ count: 0 } as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/pool/${POOL_ID}/requests/${REQ_ID}/reject`,
			{ userId: GM },
		);
		expect(r.status).toBe(404);
	});
});
