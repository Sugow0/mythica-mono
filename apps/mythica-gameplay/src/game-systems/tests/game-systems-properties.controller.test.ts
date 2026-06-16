import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	gameSystem: {
		findUnique: mock(async () => null as unknown),
	},
	characterSheetProperty: {
		findUnique: mock(async () => null as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	gameSystemProperty: {
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { gameSystemsController } =
	require("../game-systems.controller") as typeof import("../game-systems.controller");

const USER = "11111111-1111-1111-1111-111111111111";
const GS = "33333333-3333-3333-3333-333333333333";
const PROP = "44444444-4444-4444-4444-444444444444";
const GSP = "55555555-5555-5555-5555-555555555555";

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
	const res = await gameSystemsController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

/** Erreur Prisma factice avec un code donné. */
function prismaError(code: string) {
	return Object.assign(new Error(`Prisma ${code}`), { code });
}

beforeEach(() => {
	for (const model of Object.values(p)) {
		for (const fn of Object.values(model)) {
			(fn as ReturnType<typeof mock>).mockReset();
		}
	}
	p.gameSystem.findUnique.mockResolvedValue(null as unknown);
	p.characterSheetProperty.findUnique.mockResolvedValue(null as unknown);
	p.characterSheetProperty.delete.mockResolvedValue({} as unknown);
	p.gameSystemProperty.create.mockResolvedValue({ id: GSP } as unknown);
	p.gameSystemProperty.update.mockResolvedValue({ id: GSP } as unknown);
	p.gameSystemProperty.delete.mockResolvedValue({ id: GSP } as unknown);
});

describe("POST /game-systems/:id/properties", () => {
	it("sans auth (401)", async () => {
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			body: { propertyId: PROP },
		});
		expect(r.status).toBe(401);
	});

	it("système introuvable (404)", async () => {
		p.gameSystem.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: { propertyId: PROP },
		});
		expect(r.status).toBe(404);
	});

	it("propriété introuvable par key (404)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		p.characterSheetProperty.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: { propertyKey: "force" },
		});
		expect(r.status).toBe(404);
	});

	it("propriété introuvable par propertyId (404)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		p.characterSheetProperty.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: { propertyId: PROP },
		});
		expect(r.status).toBe(404);
	});

	it("body sans propertyId ni propertyKey (400)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: {},
		});
		expect(r.status).toBe(400);
	});

	it("succès avec propertyId (201)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		p.characterSheetProperty.findUnique.mockResolvedValue({
			id: PROP,
		} as unknown);
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: { propertyId: PROP, displayOrder: 3, groupName: "Stats" },
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		expect(r.json?.id).toBe(GSP);
		const data = p.gameSystemProperty.create.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(data.data.gameSystemId).toBe(GS);
		expect(data.data.propertyId).toBe(PROP);
		expect(data.data.displayOrder).toBe(3);
		expect(data.data.groupName).toBe("Stats");
	});

	it("succès via propertyKey résolu (201)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		p.characterSheetProperty.findUnique.mockResolvedValue({
			id: PROP,
		} as unknown);
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: { propertyKey: "force" },
		});
		expect(r.status).toBe(201);
		expect(p.characterSheetProperty.findUnique).toHaveBeenCalledWith({
			where: { key: "force" },
		});
		const data = p.gameSystemProperty.create.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(data.data.propertyId).toBe(PROP);
	});

	it("doublon (409)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		p.characterSheetProperty.findUnique.mockResolvedValue({
			id: PROP,
		} as unknown);
		p.gameSystemProperty.create.mockRejectedValue(prismaError("P2002"));
		const r = await call("POST", `/game-systems/${GS}/properties`, {
			userId: USER,
			body: { propertyId: PROP },
		});
		expect(r.status).toBe(409);
	});
});

describe("PATCH /game-systems/:id/properties/:propertyId", () => {
	it("sans auth (401)", async () => {
		const r = await call("PATCH", `/game-systems/${GS}/properties/${PROP}`, {
			body: { displayOrder: 2 },
		});
		expect(r.status).toBe(401);
	});

	it("succès (200) et passe les champs à update", async () => {
		const r = await call("PATCH", `/game-systems/${GS}/properties/${PROP}`, {
			userId: USER,
			body: { overrideLabel: "PV max", displayOrder: 7, formula: "con*2" },
		});
		expect(r.status).toBe(200);
		const arg = p.gameSystemProperty.update.mock.calls[0]?.[0] as {
			where: Record<string, unknown>;
			data: Record<string, unknown>;
		};
		expect(arg.where.gameSystemId_propertyId).toEqual({
			gameSystemId: GS,
			propertyId: PROP,
		});
		expect(arg.data.overrideLabel).toBe("PV max");
		expect(arg.data.displayOrder).toBe(7);
		expect(arg.data.formula).toBe("con*2");
	});

	it("couple absent (404)", async () => {
		p.gameSystemProperty.update.mockRejectedValue(prismaError("P2025"));
		const r = await call("PATCH", `/game-systems/${GS}/properties/${PROP}`, {
			userId: USER,
			body: { displayOrder: 1 },
		});
		expect(r.status).toBe(404);
	});
});

describe("DELETE /game-systems/:id/properties/:propertyId", () => {
	it("sans auth (401)", async () => {
		const r = await call("DELETE", `/game-systems/${GS}/properties/${PROP}`);
		expect(r.status).toBe(401);
	});

	it("succès (200) supprime gameSystemProperty et PAS la propriété globale", async () => {
		const r = await call("DELETE", `/game-systems/${GS}/properties/${PROP}`, {
			userId: USER,
		});
		expect(r.status).toBe(200);
		expect(p.gameSystemProperty.delete).toHaveBeenCalledTimes(1);
		const arg = p.gameSystemProperty.delete.mock.calls[0]?.[0] as {
			where: Record<string, unknown>;
		};
		expect(arg.where.gameSystemId_propertyId).toEqual({
			gameSystemId: GS,
			propertyId: PROP,
		});
		expect(p.characterSheetProperty.delete).not.toHaveBeenCalled();
	});

	it("absent (404)", async () => {
		p.gameSystemProperty.delete.mockRejectedValue(prismaError("P2025"));
		const r = await call("DELETE", `/game-systems/${GS}/properties/${PROP}`, {
			userId: USER,
		});
		expect(r.status).toBe(404);
	});
});
