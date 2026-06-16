import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	gameSystem: {
		findMany: mock(async () => [] as unknown[]),
		count: mock(async () => 0),
		findUnique: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
	gameSystemProperty: {
		findMany: mock(async () => [] as unknown[]),
	},
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { gameSystemsController } =
	require("../game-systems.controller") as typeof import("../game-systems.controller");

const GS = "33333333-3333-3333-3333-333333333333";

type CallOpts = { userId?: string; role?: string };

async function call(method: string, path: string, opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	if (opts.role) headers["x-user-role"] = opts.role;
	const res = await gameSystemsController.handle(
		new Request(`http://localhost${path}`, { method, headers }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

/** Mapping GameSystemProperty + propriété jointe. */
function mapping(extra: Record<string, unknown> = {}) {
	return {
		id: "m1",
		gameSystemId: GS,
		propertyId: "p1",
		displayOrder: 0,
		groupName: null,
		isRequired: false,
		overrideLabel: null,
		overrideDefault: null,
		formula: null,
		property: {
			id: "p1",
			key: "force",
			label: "Force",
			type: "number",
			defaultValue: "10",
			options: null,
			description: "Caractéristique",
		},
		...extra,
	};
}

beforeEach(() => {
	for (const model of Object.values(p)) {
		for (const fn of Object.values(model)) {
			(fn as ReturnType<typeof mock>).mockReset();
		}
	}
	p.gameSystem.findUnique.mockResolvedValue(null as unknown);
	p.gameSystemProperty.findMany.mockResolvedValue([] as unknown);
});

describe("GET /game-systems/:id/properties", () => {
	it("404 si système introuvable", async () => {
		p.gameSystem.findUnique.mockResolvedValue(null as unknown);
		const r = await call("GET", `/game-systems/${GS}/properties`);
		expect(r.status).toBe(404);
		expect(r.json?.success).toBe(false);
	});

	it("200 + mapping vide => properties: []", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		p.gameSystemProperty.findMany.mockResolvedValue([] as unknown);
		const r = await call("GET", `/game-systems/${GS}/properties`);
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		expect(r.json?.properties).toEqual([]);
	});

	it("200 + properties triées par displayOrder avec fusion override", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
		// Renvoyées déjà ordonnées par Prisma (orderBy displayOrder asc).
		p.gameSystemProperty.findMany.mockResolvedValue([
			mapping({
				id: "m1",
				propertyId: "p1",
				displayOrder: 1,
				overrideLabel: null,
				overrideDefault: null,
				groupName: "Caractéristiques",
				isRequired: true,
				formula: null,
				property: {
					id: "p1",
					key: "force",
					label: "Force",
					type: "number",
					defaultValue: "10",
					options: null,
					description: "Caractéristique",
				},
			}),
			mapping({
				id: "m2",
				propertyId: "p2",
				displayOrder: 2,
				overrideLabel: "PV max",
				overrideDefault: "20",
				groupName: "Combat",
				isRequired: false,
				formula: "force * 2",
				property: {
					id: "p2",
					key: "hp",
					label: "Points de vie",
					type: "number",
					defaultValue: "10",
					options: ["a", "b"],
					description: "Santé",
				},
			}),
		] as unknown);

		const r = await call("GET", `/game-systems/${GS}/properties`);
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		const props = r.json?.properties as Record<string, unknown>[];
		expect(props.length).toBe(2);

		// Tri préservé.
		expect(props[0].displayOrder).toBe(1);
		expect(props[1].displayOrder).toBe(2);

		// Sans override : label / defaultValue de la propriété.
		expect(props[0]).toMatchObject({
			propertyId: "p1",
			key: "force",
			label: "Force",
			type: "number",
			defaultValue: "10",
			options: null,
			description: "Caractéristique",
			groupName: "Caractéristiques",
			isRequired: true,
			formula: null,
		});

		// Avec override : override_label / override_default appliqués.
		expect(props[1]).toMatchObject({
			propertyId: "p2",
			key: "hp",
			label: "PV max",
			type: "number",
			defaultValue: "20",
			options: ["a", "b"],
			description: "Santé",
			groupName: "Combat",
			isRequired: false,
			formula: "force * 2",
		});

		// Vérifie l'appel Prisma attendu.
		const arg = p.gameSystemProperty.findMany.mock.calls[0]?.[0] as {
			where: { gameSystemId: string };
			orderBy: { displayOrder: string };
		};
		expect(arg.where.gameSystemId).toBe(GS);
		expect(arg.orderBy.displayOrder).toBe("asc");
	});
});
