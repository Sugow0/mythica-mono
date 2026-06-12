import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	campaign: {
		findMany: mock(async () => [] as unknown[]),
		count: mock(async () => 0),
		findFirst: mock(async () => null as unknown),
		findUnique: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
	},
	campaignMember: {
		findFirst: mock(async () => null as unknown),
		findUnique: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
	},
	gameSystem: { findUnique: mock(async () => null as unknown) },
	session: {
		findMany: mock(async () => [] as unknown[]),
		findFirst: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	campaignInvite: {
		create: mock(async () => ({}) as unknown),
		findUnique: mock(async () => null as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	$transaction: mock(async (ops: Promise<unknown>[]) => Promise.all(ops)),
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { campaignsController } =
	require("../campaigns.controller") as typeof import("../campaigns.controller");

const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const GS = "33333333-3333-3333-3333-333333333333";
const CID = "44444444-4444-4444-4444-444444444444";

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
		coverFileId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
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
	p.campaign.findMany.mockResolvedValue([] as unknown);
	p.campaign.count.mockResolvedValue(0 as unknown);
	p.session.findMany.mockResolvedValue([] as unknown);
	p.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
		Promise.all(ops),
	);
	p.campaign.create.mockResolvedValue(activeCampaign() as unknown);
	p.campaignMember.create.mockResolvedValue({} as unknown);
	p.campaignMember.update.mockResolvedValue({} as unknown);
	p.campaign.update.mockResolvedValue(activeCampaign() as unknown);
	p.session.create.mockResolvedValue({ id: "s1" } as unknown);
	p.session.update.mockResolvedValue({} as unknown);
	p.session.delete.mockResolvedValue({} as unknown);
	p.campaignInvite.create.mockResolvedValue({} as unknown);
	p.campaignInvite.delete.mockResolvedValue({} as unknown);
});

describe("campaigns CRUD", () => {
	it("GET /campaigns/ liste publique (200)", async () => {
		p.campaign.findMany.mockResolvedValue([activeCampaign()] as unknown);
		p.campaign.count.mockResolvedValue(1 as unknown);
		const r = await call("GET", "/campaigns/?page=1&limit=10");
		expect(r.status).toBe(200);
		expect((r.json?.items as unknown[]).length).toBe(1);
	});

	it("GET /campaigns/ avec recherche", async () => {
		const r = await call("GET", "/campaigns/?search=drag");
		expect(r.status).toBe(200);
	});

	it("GET /campaigns/mine sans auth (401)", async () => {
		const r = await call("GET", "/campaigns/mine");
		expect(r.status).toBe(401);
	});

	it("GET /campaigns/mine (200)", async () => {
		p.campaign.findMany.mockResolvedValue([activeCampaign()] as unknown);
		const r = await call("GET", "/campaigns/mine", { userId: OWNER });
		expect(r.status).toBe(200);
	});

	it("POST /campaigns/ sans auth (401)", async () => {
		const r = await call("POST", "/campaigns/", {
			body: { nom: "X", gameSystemId: GS },
		});
		expect(r.status).toBe(401);
	});

	it("POST /campaigns/ système introuvable (400)", async () => {
		p.gameSystem.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", "/campaigns/", {
			userId: OWNER,
			body: { nom: "X", gameSystemId: GS },
		});
		expect(r.status).toBe(400);
	});

	it("POST /campaigns/ succès (201)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		const r = await call("POST", "/campaigns/", {
			userId: OWNER,
			body: { nom: "Ma campagne", gameSystemId: GS, isPublic: true },
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
	});

	it("GET /campaigns/:id introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(null as unknown);
		const r = await call("GET", `/campaigns/${CID}`);
		expect(r.status).toBe(404);
	});

	it("GET /campaigns/:id privée non-membre (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ isPublic: false, members: [] }) as unknown,
		);
		const r = await call("GET", `/campaigns/${CID}`, { userId: OTHER });
		expect(r.status).toBe(403);
	});

	it("GET /campaigns/:id publique (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(
			activeCampaign({ members: [] }) as unknown,
		);
		const r = await call("GET", `/campaigns/${CID}`, { userId: OWNER });
		expect(r.status).toBe(200);
	});

	it("PATCH /campaigns/:id non-propriétaire (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		const r = await call("PATCH", `/campaigns/${CID}`, {
			userId: OTHER,
			body: { nom: "New" },
		});
		expect(r.status).toBe(403);
	});

	it("PATCH /campaigns/:id propriétaire (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		const r = await call("PATCH", `/campaigns/${CID}`, {
			userId: OWNER,
			body: { nom: "New" },
		});
		expect(r.status).toBe(200);
	});

	it("DELETE /campaigns/:id propriétaire (200, soft delete)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		const r = await call("DELETE", `/campaigns/${CID}`, { userId: OWNER });
		expect(r.status).toBe(200);
		expect(p.campaign.update).toHaveBeenCalled();
	});
});

describe("campaigns membres", () => {
	it("POST /:id/join campagne publique (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", `/campaigns/${CID}/join`, { userId: OTHER });
		expect(r.status).toBe(200);
		expect(p.campaignMember.create).toHaveBeenCalled();
	});

	it("POST /:id/join déjà membre (409)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findUnique.mockResolvedValue({
			id: "m1",
			leftAt: null,
		} as unknown);
		const r = await call("POST", `/campaigns/${CID}/join`, { userId: OTHER });
		expect(r.status).toBe(409);
	});

	it("DELETE /:id/leave (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue({ id: "m1" } as unknown);
		const r = await call("DELETE", `/campaigns/${CID}/leave`, {
			userId: OTHER,
		});
		expect(r.status).toBe(200);
	});

	it("PUT /:id/members/:userId/role (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue({ id: "m1" } as unknown);
		const r = await call("PUT", `/campaigns/${CID}/members/${OTHER}/role`, {
			userId: OWNER,
			body: { role: "gm" },
		});
		expect(r.status).toBe(200);
	});

	it("DELETE /:id/members/:userId (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue({ id: "m1" } as unknown);
		const r = await call("DELETE", `/campaigns/${CID}/members/${OTHER}`, {
			userId: OWNER,
		});
		expect(r.status).toBe(200);
	});
});

describe("campaigns sessions", () => {
	it("GET /:id/sessions membre (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		const r = await call("GET", `/campaigns/${CID}/sessions`, {
			userId: OWNER,
		});
		expect(r.status).toBe(200);
	});

	it("POST /:id/sessions MJ (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		const r = await call("POST", `/campaigns/${CID}/sessions`, {
			userId: OWNER,
			body: { nom: "Séance 1" },
		});
		expect(r.status).toBe(201);
	});

	it("PUT /:id/sessions/:sid (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.session.findFirst.mockResolvedValue({ id: "s1" } as unknown);
		const r = await call("PUT", `/campaigns/${CID}/sessions/s1`, {
			userId: OWNER,
			body: { status: "active" },
		});
		expect(r.status).toBe(200);
	});

	it("DELETE /:id/sessions/:sid (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		p.session.findFirst.mockResolvedValue({ id: "s1" } as unknown);
		const r = await call("DELETE", `/campaigns/${CID}/sessions/s1`, {
			userId: OWNER,
		});
		expect(r.status).toBe(200);
	});
});

describe("campaigns invitations", () => {
	it("POST /:id/invites MJ (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(activeCampaign() as unknown);
		const r = await call("POST", `/campaigns/${CID}/invites`, {
			userId: OWNER,
		});
		expect(r.status).toBe(201);
		expect(r.json?.token).toBeDefined();
	});

	it("GET /invites/:token valide (200)", async () => {
		p.campaignInvite.findUnique.mockResolvedValue({
			token: "tok",
			expiresAt: new Date(Date.now() + 3_600_000),
			campaign: activeCampaign(),
		} as unknown);
		const r = await call("GET", "/campaigns/invites/tok");
		expect(r.status).toBe(200);
	});

	it("GET /invites/:token expirée (410)", async () => {
		p.campaignInvite.findUnique.mockResolvedValue({
			id: "i1",
			token: "tok",
			expiresAt: new Date(Date.now() - 1_000),
			campaign: activeCampaign(),
		} as unknown);
		const r = await call("GET", "/campaigns/invites/tok");
		expect(r.status).toBe(410);
	});

	it("POST /invites/:token/accept (200)", async () => {
		p.campaignInvite.findUnique.mockResolvedValue({
			id: "i1",
			campaignId: CID,
			token: "tok",
			expiresAt: new Date(Date.now() + 3_600_000),
			campaign: activeCampaign(),
		} as unknown);
		p.campaignMember.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", "/campaigns/invites/tok/accept", {
			userId: OTHER,
		});
		expect(r.status).toBe(200);
		expect(r.json?.campaignId).toBe(CID);
	});
});
