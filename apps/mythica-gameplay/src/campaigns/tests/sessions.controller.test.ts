import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	campaign: {
		findFirst: mock(async () => null as unknown),
	},
	campaignMember: {
		findFirst: mock(async () => null as unknown),
		findMany: mock(async () => [] as unknown[]),
	},
	session: {
		findUnique: mock(async () => null as unknown),
		update: mock(async () => ({}) as unknown),
	},
};
mock.module("../../lib/prisma", () => ({ prisma: p }));

// Redis mocké : hash de présence + pub/sub en mémoire.
const hashes = new Map<string, Map<string, number>>();
const published: Array<{ channel: string; payload: string }> = [];
function hash(key: string) {
	let h = hashes.get(key);
	if (!h) {
		h = new Map();
		hashes.set(key, h);
	}
	return h;
}
const redisMock = {
	hincrby: mock(async (k: string, f: string, by: number) => {
		const h = hash(k);
		const n = (h.get(f) ?? 0) + by;
		h.set(f, n);
		return n;
	}),
	hdel: mock(async (k: string, f: string) => (hash(k).delete(f) ? 1 : 0)),
	hkeys: mock(async (k: string) => [...hash(k).keys()]),
	expire: mock(async () => 1),
	publish: mock(async (channel: string, payload: string) => {
		published.push({ channel, payload });
		return 1;
	}),
	duplicate: mock(() => ({
		on: mock(() => {}),
		subscribe: mock(async () => {}),
		unsubscribe: mock(async () => {}),
		disconnect: mock(() => {}),
	})),
};
mock.module("../../lib/redis", () => ({ redis: redisMock, redisConsumer: {} }));

const { sessionsController } =
	require("../sessions.controller") as typeof import("../sessions.controller");

const OWNER = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";
const STRANGER = "33333333-3333-3333-3333-333333333333";
const CID = "44444444-4444-4444-4444-444444444444";
const SID = "55555555-5555-5555-5555-555555555555";

type CallOpts = { userId?: string; body?: unknown };
async function call(method: string, path: string, opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers["content-type"] = "application/json";
		body = JSON.stringify(opts.body);
	}
	const res = await sessionsController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

function aSession(extra: Record<string, unknown> = {}) {
	return {
		id: SID,
		campaignId: CID,
		nom: "Donjon",
		status: "scheduled",
		scheduledAt: null,
		startedAt: null,
		endedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...extra,
	};
}
function aCampaign(extra: Record<string, unknown> = {}) {
	return { id: CID, ownerId: OWNER, nom: "Camp", deletedAt: null, ...extra };
}
function aMember(userId: string, role: string) {
	return {
		id: "66666666-6666-6666-6666-666666666666",
		campaignId: CID,
		userId,
		role,
		joinedAt: new Date(),
		leftAt: null,
		user: { pseudo: null },
	};
}

beforeEach(() => {
	for (const model of Object.values(p))
		for (const fn of Object.values(model))
			(fn as ReturnType<typeof mock>).mockClear();
	p.campaign.findFirst.mockResolvedValue(null);
	p.campaignMember.findFirst.mockResolvedValue(null);
	p.campaignMember.findMany.mockResolvedValue([]);
	p.session.findUnique.mockResolvedValue(null);
	p.session.update.mockResolvedValue({});
	hashes.clear();
	published.length = 0;
});

describe("GET /sessions/:id", () => {
	it("401 si non authentifié", async () => {
		const r = await call("GET", `/sessions/${SID}`);
		expect(r.status).toBe(401);
	});

	it("404 si la session est introuvable", async () => {
		const r = await call("GET", `/sessions/${SID}`, { userId: OWNER });
		expect(r.status).toBe(404);
	});

	it("404 si la campagne est supprimée", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(null);
		const r = await call("GET", `/sessions/${SID}`, { userId: OWNER });
		expect(r.status).toBe(404);
	});

	it("403 si l'utilisateur n'est pas membre", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		p.campaignMember.findFirst.mockResolvedValue(null);
		const r = await call("GET", `/sessions/${SID}`, { userId: STRANGER });
		expect(r.status).toBe(403);
	});

	it("200 pour le propriétaire avec membres", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		p.campaignMember.findMany.mockResolvedValue([aMember(PLAYER, "player")]);
		const r = await call("GET", `/sessions/${SID}`, { userId: OWNER });
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		const session = r.json?.session as Record<string, unknown>;
		expect(session.id).toBe(SID);
		expect(r.json?.campaign).toMatchObject({ id: CID, ownerId: OWNER });
		expect((r.json?.members as unknown[]).length).toBe(1);
	});

	it("200 pour un membre joueur", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		p.campaignMember.findFirst.mockResolvedValue(aMember(PLAYER, "player"));
		p.campaignMember.findMany.mockResolvedValue([aMember(PLAYER, "player")]);
		const r = await call("GET", `/sessions/${SID}`, { userId: PLAYER });
		expect(r.status).toBe(200);
	});
});

describe("POST /sessions/:id/launch", () => {
	it("401 si non authentifié", async () => {
		const r = await call("POST", `/sessions/${SID}/launch`);
		expect(r.status).toBe(401);
	});

	it("404 si la session est introuvable", async () => {
		const r = await call("POST", `/sessions/${SID}/launch`, { userId: OWNER });
		expect(r.status).toBe(404);
	});

	it("403 si un joueur tente de lancer", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		p.campaignMember.findFirst.mockResolvedValue(aMember(PLAYER, "player"));
		const r = await call("POST", `/sessions/${SID}/launch`, { userId: PLAYER });
		expect(r.status).toBe(403);
	});

	it("400 si la session est déjà terminée", async () => {
		p.session.findUnique.mockResolvedValue(aSession({ status: "ended" }));
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		const r = await call("POST", `/sessions/${SID}/launch`, { userId: OWNER });
		expect(r.status).toBe(400);
	});

	it("200 le propriétaire lance la session (statut active + startedAt)", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		const r = await call("POST", `/sessions/${SID}/launch`, { userId: OWNER });
		expect(r.status).toBe(200);
		expect(r.json?.status).toBe("active");
		const updateArg = p.session.update.mock.calls[0]?.[0] as {
			data: { status: string; startedAt?: Date };
		};
		expect(updateArg.data.status).toBe("active");
		expect(updateArg.data.startedAt).toBeInstanceOf(Date);
		// Diffuse le changement de statut sur le canal de présence.
		expect(published.some((e) => e.payload.includes("active"))).toBe(true);
	});

	it("200 un MJ membre peut lancer", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign({ ownerId: STRANGER }));
		p.campaignMember.findFirst.mockResolvedValue(aMember(PLAYER, "gm"));
		const r = await call("POST", `/sessions/${SID}/launch`, { userId: PLAYER });
		expect(r.status).toBe(200);
	});
});

describe("GET /sessions/:id/presence/stream", () => {
	it("401 si non authentifié", async () => {
		const res = await sessionsController.handle(
			new Request(`http://localhost/sessions/${SID}/presence/stream`),
		);
		expect(res.status).toBe(401);
		await res.body?.cancel();
	});

	it("403 si non membre", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		const res = await sessionsController.handle(
			new Request(`http://localhost/sessions/${SID}/presence/stream`, {
				headers: { "x-user-id": STRANGER },
			}),
		);
		expect(res.status).toBe(403);
		await res.body?.cancel();
	});

	it("200 flux SSE pour un membre et enregistre la présence", async () => {
		p.session.findUnique.mockResolvedValue(aSession());
		p.campaign.findFirst.mockResolvedValue(aCampaign());
		const res = await sessionsController.handle(
			new Request(`http://localhost/sessions/${SID}/presence/stream`, {
				headers: { "x-user-id": OWNER },
			}),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/event-stream");
		// L'utilisateur est inscrit dans le hash de présence.
		expect(hashes.get(`session:${SID}:presence:members`)?.has(OWNER)).toBe(
			true,
		);
		await res.body?.cancel();
	});
});
