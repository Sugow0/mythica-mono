import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS =====

const p = {
	campaign: { findFirst: mock(async () => null as unknown) },
	campaignMember: { findFirst: mock(async () => null as unknown) },
	encounter: {
		findMany: mock(async () => [] as unknown[]),
		findFirst: mock(async () => null as unknown),
		create: mock(async () => ({ id: ENCOUNTER }) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	encounterMonster: {
		create: mock(async () => ({ id: MONSTER }) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { encountersController } =
	require("../encounters.controller") as typeof import("../encounters.controller");

const GM = "11111111-1111-1111-1111-111111111111";
const PLAYER = "22222222-2222-2222-2222-222222222222";
const CID = "44444444-4444-4444-4444-444444444444";
const ENCOUNTER = "55555555-5555-5555-5555-555555555555";
const MONSTER = "66666666-6666-6666-6666-666666666666";
const SHEET = "77777777-7777-7777-7777-777777777777";

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
	const res = await encountersController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

function campaign(extra: Record<string, unknown> = {}) {
	return { id: CID, ownerId: GM, deletedAt: null, ...extra };
}
function member(role: string) {
	return { id: "m1", campaignId: CID, role, leftAt: null };
}

beforeEach(() => {
	for (const model of Object.values(p)) {
		for (const fn of Object.values(model as Record<string, unknown>)) {
			(fn as ReturnType<typeof mock>).mockReset();
		}
	}
	p.campaign.findFirst.mockResolvedValue(null as unknown);
	p.campaignMember.findFirst.mockResolvedValue(null as unknown);
	p.encounter.findMany.mockResolvedValue([] as unknown);
	p.encounter.findFirst.mockResolvedValue(null as unknown);
	p.encounter.create.mockResolvedValue({ id: ENCOUNTER } as unknown);
	p.encounter.delete.mockResolvedValue({} as unknown);
	p.encounterMonster.create.mockResolvedValue({ id: MONSTER } as unknown);
	p.encounterMonster.delete.mockResolvedValue({} as unknown);
});

describe("GET /campaigns/:id/encounters", () => {
	it("sans auth (401)", async () => {
		const r = await call("GET", `/campaigns/${CID}/encounters`);
		expect(r.status).toBe(401);
	});

	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call("GET", `/campaigns/${CID}/encounters`, {
			userId: PLAYER,
		});
		expect(r.status).toBe(403);
	});

	it("campagne introuvable (404)", async () => {
		const r = await call("GET", `/campaigns/${CID}/encounters`, {
			userId: GM,
		});
		expect(r.status).toBe(404);
	});

	it("liste avec monstres, nom résolu depuis characterSheet (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.encounter.findMany.mockResolvedValue([
			{
				id: ENCOUNTER,
				nom: "Embuscade",
				difficulty: "moyen",
				monsters: [
					{
						id: MONSTER,
						characterSheetId: SHEET,
						quantity: 2,
						characterSheet: { name: "Gobelin", avatarFileId: null },
					},
				],
			},
		] as unknown);
		const r = await call("GET", `/campaigns/${CID}/encounters`, {
			userId: GM,
		});
		expect(r.status).toBe(200);
		const items = r.json?.items as Record<string, unknown>[];
		expect(items[0].nom).toBe("Embuscade");
		expect((items[0].monsters as Record<string, unknown>[])[0].name).toBe(
			"Gobelin",
		);
	});
});

describe("POST /campaigns/:id/encounters", () => {
	it("sans auth (401)", async () => {
		const r = await call("POST", `/campaigns/${CID}/encounters`, {
			body: { nom: "Embuscade" },
		});
		expect(r.status).toBe(401);
	});

	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call("POST", `/campaigns/${CID}/encounters`, {
			userId: PLAYER,
			body: { nom: "Embuscade" },
		});
		expect(r.status).toBe(403);
	});

	it("création réussie (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await call("POST", `/campaigns/${CID}/encounters`, {
			userId: GM,
			body: { nom: "Embuscade" },
		});
		expect(r.status).toBe(201);
		expect(r.json?.id).toBe(ENCOUNTER);
		expect(p.encounter.create).toHaveBeenCalled();
	});
});

describe("DELETE /campaigns/:id/encounters/:encounterId", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/encounters/${ENCOUNTER}`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("suppression réussie (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/encounters/${ENCOUNTER}`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		expect(p.encounter.delete).toHaveBeenCalled();
	});
});

describe("POST /campaigns/:id/encounters/:encounterId/monsters", () => {
	it("rencontre introuvable (404)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.encounter.findFirst.mockResolvedValue(null as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/encounters/${ENCOUNTER}/monsters`,
			{ userId: GM, body: { characterSheetId: SHEET } },
		);
		expect(r.status).toBe(404);
	});

	it("ajout réussi (201)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.encounter.findFirst.mockResolvedValue({ id: ENCOUNTER } as unknown);
		const r = await call(
			"POST",
			`/campaigns/${CID}/encounters/${ENCOUNTER}/monsters`,
			{ userId: GM, body: { characterSheetId: SHEET, quantity: 3 } },
		);
		expect(r.status).toBe(201);
		expect(r.json?.id).toBe(MONSTER);
		const createCall = p.encounterMonster.create.mock.calls[0]?.[0] as {
			data: { quantity: number };
		};
		expect(createCall?.data?.quantity).toBe(3);
	});
});

describe("DELETE /campaigns/:id/encounters/:encounterId/monsters/:monsterId", () => {
	it("réservé au MJ (403)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		p.campaignMember.findFirst.mockResolvedValue(member("player") as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/encounters/${ENCOUNTER}/monsters/${MONSTER}`,
			{ userId: PLAYER },
		);
		expect(r.status).toBe(403);
	});

	it("retrait réussi (200)", async () => {
		p.campaign.findFirst.mockResolvedValue(campaign() as unknown);
		const r = await call(
			"DELETE",
			`/campaigns/${CID}/encounters/${ENCOUNTER}/monsters/${MONSTER}`,
			{ userId: GM },
		);
		expect(r.status).toBe(200);
		expect(p.encounterMonster.delete).toHaveBeenCalled();
	});
});
