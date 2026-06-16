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
		createMany: mock(async () => ({ count: 0 }) as unknown),
	},
	$transaction: mock(async (fn: (tx: unknown) => Promise<unknown>) => fn(p)),
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { gameSystemsController } =
	require("../game-systems.controller") as typeof import("../game-systems.controller");

const PARENT_ID = "11111111-1111-1111-1111-111111111111";
const GS = "33333333-3333-3333-3333-333333333333";

type CallOpts = { userId?: string; role?: string; body?: unknown };

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

async function post(opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	if (opts.role) headers["x-user-role"] = opts.role;
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers["content-type"] = "application/json";
		body = JSON.stringify(opts.body);
	}
	const res = await gameSystemsController.handle(
		new Request("http://localhost/game-systems", {
			method: "POST",
			headers,
			body,
		}),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

function aBody(extra: Record<string, unknown> = {}) {
	return {
		nom: "Mon système custom",
		version: "1.0",
		slug: "mon-systeme-custom",
		...extra,
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
	p.gameSystem.findMany.mockReset();
	p.gameSystem.findMany.mockResolvedValue([] as unknown[]);
	p.gameSystem.count.mockReset();
	p.gameSystem.count.mockResolvedValue(0);
	p.gameSystem.findUnique.mockReset();
	p.gameSystem.findUnique.mockResolvedValue(null as unknown);
	p.gameSystem.create.mockReset();
	p.gameSystem.create.mockResolvedValue({} as unknown);
	p.gameSystem.update.mockReset();
	p.gameSystem.update.mockResolvedValue({} as unknown);
	p.gameSystem.delete.mockReset();
	p.gameSystem.delete.mockResolvedValue({} as unknown);
	p.gameSystemProperty.findMany.mockReset();
	p.gameSystemProperty.findMany.mockResolvedValue([] as unknown[]);
	p.gameSystemProperty.createMany.mockReset();
	p.gameSystemProperty.createMany.mockResolvedValue({ count: 0 } as unknown);
	p.$transaction.mockReset();
	p.$transaction.mockImplementation(
		async (fn: (tx: unknown) => Promise<unknown>) => fn(p),
	);
});

describe("POST /game-systems", () => {
	it("renvoie 401 si non authentifié", async () => {
		const res = await post({ body: aBody() });
		expect(res.status).toBe(401);
		expect(res.json?.success).toBe(false);
		expect(p.gameSystem.create).not.toHaveBeenCalled();
	});

	it("crée un système custom sans parent pour un USER (201, isOfficial forcé à false)", async () => {
		const res = await post({
			userId: "u1",
			role: "USER",
			body: aBody({ isOfficial: true }),
		});

		expect(res.status).toBe(201);
		expect(res.json?.success).toBe(true);
		expect(typeof res.json?.id).toBe("string");

		expect(p.gameSystem.create).toHaveBeenCalledTimes(1);
		const arg = p.gameSystem.create.mock.calls[0]?.[0] as {
			data: { isOfficial: boolean; parentSystemId: string | null };
		};
		// Un non-admin ne peut JAMAIS créer un système officiel.
		expect(arg.data.isOfficial).toBe(false);
		expect(arg.data.parentSystemId).toBeNull();
		// Pas de fork → pas de copie de propriétés.
		expect(p.gameSystemProperty.findMany).not.toHaveBeenCalled();
		expect(p.gameSystemProperty.createMany).not.toHaveBeenCalled();
	});

	it("copie les game_system_properties du parent lors d'un fork (dans une transaction)", async () => {
		p.gameSystem.findUnique.mockResolvedValue({ id: PARENT_ID } as unknown);
		p.gameSystemProperty.findMany.mockResolvedValue([
			{
				id: "prop-1",
				gameSystemId: PARENT_ID,
				propertyId: "prty-a",
				displayOrder: 0,
				groupName: "Stats",
				isRequired: true,
				overrideLabel: "Force",
				overrideDefault: "10",
				formula: null,
			},
			{
				id: "prop-2",
				gameSystemId: PARENT_ID,
				propertyId: "prty-b",
				displayOrder: 1,
				groupName: null,
				isRequired: false,
				overrideLabel: null,
				overrideDefault: null,
				formula: "@force * 2",
			},
		] as unknown[]);

		const res = await post({
			userId: "u1",
			role: "USER",
			body: aBody({ parentSystemId: PARENT_ID }),
		});

		expect(res.status).toBe(201);
		const newId = res.json?.id as string;

		// Utilisation d'une transaction.
		expect(p.$transaction).toHaveBeenCalledTimes(1);

		// Copie des propriétés du parent.
		expect(p.gameSystemProperty.findMany).toHaveBeenCalledWith({
			where: { gameSystemId: PARENT_ID },
		});
		expect(p.gameSystemProperty.createMany).toHaveBeenCalledTimes(1);

		const createArg = p.gameSystemProperty.createMany.mock.calls[0]?.[0] as {
			data: Array<{
				id: string;
				gameSystemId: string;
				propertyId: string;
				displayOrder: number;
				groupName: string | null;
				isRequired: boolean;
				overrideLabel: string | null;
				overrideDefault: string | null;
				formula: string | null;
			}>;
		};
		expect(createArg.data).toHaveLength(2);

		const copied = createArg.data;
		// Mêmes propertyId, attachées au nouveau système, nouveaux id.
		expect(copied.map((c) => c.propertyId)).toEqual(["prty-a", "prty-b"]);
		for (const c of copied) {
			expect(c.gameSystemId).toBe(newId);
			expect(c.id).not.toBe("prop-1");
			expect(c.id).not.toBe("prop-2");
			expect(typeof c.id).toBe("string");
		}
		// Champs copiés à l'identique.
		expect(copied[0]).toMatchObject({
			propertyId: "prty-a",
			displayOrder: 0,
			groupName: "Stats",
			isRequired: true,
			overrideLabel: "Force",
			overrideDefault: "10",
			formula: null,
		});
		expect(copied[1]).toMatchObject({
			propertyId: "prty-b",
			displayOrder: 1,
			groupName: null,
			isRequired: false,
			formula: "@force * 2",
		});
	});

	it("renvoie 404 si parentSystemId est inexistant", async () => {
		p.gameSystem.findUnique.mockResolvedValue(null as unknown);

		const res = await post({
			userId: "u1",
			role: "USER",
			body: aBody({ parentSystemId: PARENT_ID }),
		});

		expect(res.status).toBe(404);
		expect(res.json?.success).toBe(false);
		expect(p.gameSystem.create).not.toHaveBeenCalled();
	});

	it("renvoie 409 en cas de conflit de slug (P2002)", async () => {
		p.$transaction.mockImplementation(async () => {
			throw { code: "P2002" };
		});

		const res = await post({
			userId: "u1",
			role: "USER",
			body: aBody(),
		});

		expect(res.status).toBe(409);
		expect(res.json?.success).toBe(false);
	});

	it("permet à un ADMIN de créer un système officiel", async () => {
		const res = await post({
			userId: "admin1",
			role: "ADMIN",
			body: aBody({ isOfficial: true }),
		});

		expect(res.status).toBe(201);
		const arg = p.gameSystem.create.mock.calls[0]?.[0] as {
			data: { isOfficial: boolean };
		};
		expect(arg.data.isOfficial).toBe(true);
	});
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
