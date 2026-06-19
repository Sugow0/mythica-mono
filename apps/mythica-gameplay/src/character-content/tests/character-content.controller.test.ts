import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	gameSystem: {
		findUnique: mock(async () => null as unknown),
	},
	gameSystemCreationStep: {
		findMany: mock(async () => [] as unknown[]),
	},
	systemContent: {
		findMany: mock(async () => [] as unknown[]),
	},
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { characterContentController } =
	require("../character-content.controller") as typeof import("../character-content.controller");

const USER = "11111111-1111-1111-1111-111111111111";
const GS = "33333333-3333-3333-3333-333333333333";

type CallOpts = { userId?: string };

async function call(method: string, path: string, opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	const res = await characterContentController.handle(
		new Request(`http://localhost${path}`, { method, headers }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

beforeEach(() => {
	p.gameSystem.findUnique.mockReset();
	p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
	p.gameSystemCreationStep.findMany.mockReset();
	p.gameSystemCreationStep.findMany.mockResolvedValue([] as unknown[]);
	p.systemContent.findMany.mockReset();
	p.systemContent.findMany.mockResolvedValue([] as unknown[]);
});

describe("GET /game-systems/:id/creation-flow", () => {
	it("401 sans authentification", async () => {
		const r = await call("GET", `/game-systems/${GS}/creation-flow`);
		expect(r.status).toBe(401);
	});

	it("404 si le système est introuvable", async () => {
		p.gameSystem.findUnique.mockResolvedValue(null as unknown);
		const r = await call("GET", `/game-systems/${GS}/creation-flow`, {
			userId: USER,
		});
		expect(r.status).toBe(404);
	});

	it("200 renvoie les étapes ordonnées", async () => {
		p.gameSystemCreationStep.findMany.mockResolvedValue([
			{
				stepKey: "race",
				order: 0,
				kind: "selection",
				config: { collectionKey: "race" },
				condition: null,
			},
			{
				stepKey: "sorts",
				order: 6,
				kind: "spellSelection",
				config: { collectionKey: "sort" },
				condition: "has_caster_class",
			},
		] as unknown[]);
		const r = await call("GET", `/game-systems/${GS}/creation-flow`, {
			userId: USER,
		});
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		const steps = r.json?.steps as Array<Record<string, unknown>>;
		expect(steps).toHaveLength(2);
		expect(steps[0].stepKey).toBe("race");
		expect(steps[1].condition).toBe("has_caster_class");
	});
});

describe("GET /game-systems/:id/content/:collectionKey", () => {
	it("401 sans authentification", async () => {
		const r = await call("GET", `/game-systems/${GS}/content/race`);
		expect(r.status).toBe(401);
	});

	it("200 renvoie le contenu de la collection", async () => {
		p.systemContent.findMany.mockResolvedValue([
			{
				id: "c1",
				collectionKey: "race",
				slug: "humain",
				name: "Humain",
				description: "desc",
				data: { speed: 9 },
				sortOrder: 0,
				portraitFileId: null,
			},
		] as unknown[]);
		const r = await call("GET", `/game-systems/${GS}/content/race`, {
			userId: USER,
		});
		expect(r.status).toBe(200);
		const items = r.json?.items as Array<Record<string, unknown>>;
		expect(items).toHaveLength(1);
		expect(items[0].slug).toBe("humain");
		// le filtre par collection est transmis à Prisma
		const arg = p.systemContent.findMany.mock.calls[0]?.[0] as {
			where: { collectionKey: string };
		};
		expect(arg.where.collectionKey).toBe("race");
	});
});
