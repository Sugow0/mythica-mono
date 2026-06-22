import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	user: {
		upsert: mock(async () => ({}) as unknown),
	},
	gameSystem: {
		findUnique: mock(async () => null as unknown),
	},
	characterSheet: {
		create: mock(async () => ({}) as unknown),
		findMany: mock(async () => [] as unknown[]),
		findUnique: mock(async () => null as unknown),
		update: mock(async () => ({}) as unknown),
	},
	gameSystemProperty: {
		findMany: mock(async () => [] as unknown[]),
	},
	characterSheetValue: {
		createMany: mock(async () => ({ count: 0 }) as unknown),
		upsert: mock(async () => ({}) as unknown),
	},
	$transaction: mock(async (arg: unknown) => {
		// Supporte les deux formes : callback (POST) et tableau d'ops (PATCH).
		if (typeof arg === "function") {
			return (arg as (tx: unknown) => Promise<unknown>)(p);
		}
		return Promise.all(arg as Promise<unknown>[]);
	}),
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { characterSheetsController } =
	require("../character-sheets.controller") as typeof import("../character-sheets.controller");

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const GS = "33333333-3333-3333-3333-333333333333";
const SHEET = "44444444-4444-4444-4444-444444444444";
const PROP_A = "55555555-5555-5555-5555-555555555555";
const PROP_B = "66666666-6666-6666-6666-666666666666";

type CallOpts = { userId?: string; body?: unknown };

async function call(method: string, path: string, opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers["content-type"] = "application/json";
		body = JSON.stringify(opts.body);
	}
	const res = await characterSheetsController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

const gameSystemBrief = {
	id: GS,
	nom: "Donjons & Dragons 5e (2014)",
	slug: "dnd5e-2014",
	version: "2014",
};

function aSheet(extra: Record<string, unknown> = {}) {
	return {
		id: SHEET,
		userId: USER,
		gameSystemId: GS,
		name: "Aragorn",
		avatarFileId: null,
		gold: null,
		abilityMethod: null,
		isActive: true,
		visibility: "private",
		createdAt: new Date("2026-06-16T00:00:00Z"),
		updatedAt: new Date("2026-06-16T00:00:00Z"),
		deletedAt: null,
		gameSystem: gameSystemBrief,
		values: [],
		selections: [],
		...extra,
	};
}

function mapping(extra: Record<string, unknown> = {}) {
	return {
		propertyId: PROP_A,
		displayOrder: 0,
		groupName: "Caractéristiques",
		isRequired: true,
		overrideLabel: null,
		overrideDefault: null,
		formula: null,
		property: {
			id: PROP_A,
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
	p.gameSystem.findUnique.mockReset();
	p.gameSystem.findUnique.mockResolvedValue({ id: GS } as unknown);
	p.characterSheet.create.mockReset();
	p.characterSheet.create.mockResolvedValue({ id: SHEET } as unknown);
	p.characterSheet.findMany.mockReset();
	p.characterSheet.findMany.mockResolvedValue([] as unknown[]);
	p.characterSheet.findUnique.mockReset();
	p.characterSheet.findUnique.mockResolvedValue(null as unknown);
	p.characterSheet.update.mockReset();
	p.characterSheet.update.mockResolvedValue({ id: SHEET } as unknown);
	p.gameSystemProperty.findMany.mockReset();
	p.gameSystemProperty.findMany.mockResolvedValue([] as unknown[]);
	p.characterSheetValue.createMany.mockReset();
	p.characterSheetValue.createMany.mockResolvedValue({ count: 0 } as unknown);
	p.characterSheetValue.upsert.mockReset();
	p.characterSheetValue.upsert.mockImplementation(async (a: unknown) => a);
	p.$transaction.mockReset();
	p.$transaction.mockImplementation(async (arg: unknown) => {
		if (typeof arg === "function") {
			return (arg as (tx: unknown) => Promise<unknown>)(p);
		}
		return Promise.all(arg as Promise<unknown>[]);
	});
});

// ==================== POST /character-sheets ====================

describe("POST /character-sheets", () => {
	const validBody = { name: "Aragorn", gameSystemId: GS };

	it("401 si non authentifié", async () => {
		const r = await call("POST", "/character-sheets", { body: validBody });
		expect(r.status).toBe(401);
		expect(p.characterSheet.create).not.toHaveBeenCalled();
	});

	it("404 si le système de jeu est introuvable", async () => {
		p.gameSystem.findUnique.mockResolvedValue(null as unknown);
		const r = await call("POST", "/character-sheets", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(404);
		expect(p.characterSheet.create).not.toHaveBeenCalled();
	});

	it("crée la fiche (201) avec id généré, rattachée à l'utilisateur courant", async () => {
		const r = await call("POST", "/character-sheets", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		expect(typeof r.json?.id).toBe("string");

		expect(p.characterSheet.create).toHaveBeenCalledTimes(1);
		const arg = p.characterSheet.create.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(arg.data.userId).toBe(USER);
		expect(arg.data.gameSystemId).toBe(GS);
		expect(arg.data.name).toBe("Aragorn");
		expect(arg.data.avatarFileId).toBeNull();
		expect(typeof arg.data.id).toBe("string");
	});

	it("initialise les valeurs des propriétés requises avec leur défaut résolu", async () => {
		p.gameSystemProperty.findMany.mockResolvedValue([
			{
				propertyId: PROP_A,
				overrideDefault: null,
				property: { defaultValue: "10" },
			},
			{
				propertyId: PROP_B,
				overrideDefault: "5",
				property: { defaultValue: "0" },
			},
		] as unknown[]);

		const r = await call("POST", "/character-sheets", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(201);

		// Filtre is_required=true côté requête.
		expect(p.gameSystemProperty.findMany).toHaveBeenCalledTimes(1);
		const findArg = p.gameSystemProperty.findMany.mock.calls[0]?.[0] as {
			where: Record<string, unknown>;
		};
		expect(findArg.where).toMatchObject({ gameSystemId: GS, isRequired: true });

		expect(p.characterSheetValue.createMany).toHaveBeenCalledTimes(1);
		const createArg = p.characterSheetValue.createMany.mock.calls[0]?.[0] as {
			data: Array<{ propertyId: string; value: unknown }>;
		};
		expect(createArg.data).toHaveLength(2);
		// override prioritaire sur le catalogue.
		const byProp = Object.fromEntries(
			createArg.data.map((d) => [d.propertyId, d.value]),
		);
		expect(byProp[PROP_A]).toBe("10");
		expect(byProp[PROP_B]).toBe("5");
	});

	it("n'initialise aucune valeur si le système n'a pas de propriété requise", async () => {
		p.gameSystemProperty.findMany.mockResolvedValue([] as unknown[]);
		const r = await call("POST", "/character-sheets", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(201);
		expect(p.characterSheetValue.createMany).not.toHaveBeenCalled();
	});

	it("400 si une clé étrangère est invalide (avatar/système, P2003)", async () => {
		p.$transaction.mockRejectedValue({ code: "P2003" });
		const r = await call("POST", "/character-sheets", {
			userId: USER,
			body: { ...validBody, avatarFileId: OTHER },
		});
		expect(r.status).toBe(400);
		expect(r.json?.success).toBe(false);
	});

	it("422 si le corps est invalide (gameSystemId non-uuid)", async () => {
		const r = await call("POST", "/character-sheets", {
			userId: USER,
			body: { name: "X", gameSystemId: "pas-un-uuid" },
		});
		expect(r.status).toBe(422);
	});
});

// ==================== GET /character-sheets ====================

describe("GET /character-sheets", () => {
	it("401 si non authentifié", async () => {
		const r = await call("GET", "/character-sheets");
		expect(r.status).toBe(401);
	});

	it("renvoie les fiches de l'utilisateur (non supprimées), triées", async () => {
		p.characterSheet.findMany.mockResolvedValue([
			aSheet({
				values: [
					{ propertyId: PROP_A, value: "12", property: { key: "force" } },
				],
			}),
		] as unknown[]);

		const r = await call("GET", "/character-sheets", { userId: USER });
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		const items = r.json?.items as Record<string, unknown>[];
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe(SHEET);
		expect(items[0].gameSystem).toMatchObject({ slug: "dnd5e-2014" });
		expect(items[0].values).toEqual([
			{ propertyId: PROP_A, key: "force", value: "12" },
		]);

		const where = (
			p.characterSheet.findMany.mock.calls[0]?.[0] as {
				where: Record<string, unknown>;
			}
		).where;
		expect(where).toMatchObject({ userId: USER, deletedAt: null });
		expect(where.gameSystemId).toBeUndefined();
	});

	it("applique le filtre ?gameSystemId", async () => {
		await call("GET", `/character-sheets?gameSystemId=${GS}`, {
			userId: USER,
		});
		const where = (
			p.characterSheet.findMany.mock.calls[0]?.[0] as {
				where: Record<string, unknown>;
			}
		).where;
		expect(where.gameSystemId).toBe(GS);
	});
});

// ==================== GET /character-sheets/:id ====================

describe("GET /character-sheets/:id", () => {
	it("401 si non authentifié", async () => {
		const r = await call("GET", `/character-sheets/${SHEET}`);
		expect(r.status).toBe(401);
	});

	it("404 si la fiche n'existe pas", async () => {
		p.characterSheet.findUnique.mockResolvedValue(null as unknown);
		const r = await call("GET", `/character-sheets/${SHEET}`, { userId: USER });
		expect(r.status).toBe(404);
	});

	it("404 si la fiche est soft-deleted", async () => {
		p.characterSheet.findUnique.mockResolvedValue(
			aSheet({ deletedAt: new Date() }) as unknown,
		);
		const r = await call("GET", `/character-sheets/${SHEET}`, { userId: USER });
		expect(r.status).toBe(404);
	});

	it("403 si la fiche appartient à un autre utilisateur", async () => {
		p.characterSheet.findUnique.mockResolvedValue(
			aSheet({ userId: OTHER }) as unknown,
		);
		const r = await call("GET", `/character-sheets/${SHEET}`, { userId: USER });
		expect(r.status).toBe(403);
	});

	it("assemble la fiche type fusionnée avec les valeurs", async () => {
		p.characterSheet.findUnique.mockResolvedValue(
			aSheet({
				values: [{ propertyId: PROP_A, value: "14" }],
			}) as unknown,
		);
		p.gameSystemProperty.findMany.mockResolvedValue([
			mapping(),
			mapping({
				propertyId: PROP_B,
				displayOrder: 1,
				isRequired: false,
				formula: "dex_modifier",
				property: {
					id: PROP_B,
					key: "initiative",
					label: "Initiative",
					type: "derived",
					defaultValue: null,
					options: null,
					description: null,
				},
			}),
		] as unknown[]);

		const r = await call("GET", `/character-sheets/${SHEET}`, { userId: USER });
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		const props = r.json?.properties as Record<string, unknown>[];
		expect(props).toHaveLength(2);

		// Propriété saisie : valeur fusionnée.
		expect(props[0]).toMatchObject({
			propertyId: PROP_A,
			key: "force",
			type: "number",
			value: "14",
		});
		// Propriété derived non saisie : value null + formula exposée.
		expect(props[1]).toMatchObject({
			propertyId: PROP_B,
			type: "derived",
			formula: "dex_modifier",
			value: null,
		});

		const findArg = p.gameSystemProperty.findMany.mock.calls[0]?.[0] as {
			where: { gameSystemId: string };
			orderBy: { displayOrder: string };
		};
		expect(findArg.where.gameSystemId).toBe(GS);
		expect(findArg.orderBy.displayOrder).toBe("asc");
	});
});

// ==================== PATCH /character-sheets/:id/values ====================

describe("PATCH /character-sheets/:id/values", () => {
	const body = [{ propertyId: PROP_A, value: "16" }];

	function allowProps(ids: string[]) {
		p.gameSystemProperty.findMany.mockResolvedValue(
			ids.map((id) => ({ propertyId: id })) as unknown[],
		);
	}

	it("401 si non authentifié", async () => {
		const r = await call("PATCH", `/character-sheets/${SHEET}/values`, {
			body,
		});
		expect(r.status).toBe(401);
	});

	it("404 si la fiche n'existe pas", async () => {
		p.characterSheet.findUnique.mockResolvedValue(null as unknown);
		const r = await call("PATCH", `/character-sheets/${SHEET}/values`, {
			userId: USER,
			body,
		});
		expect(r.status).toBe(404);
	});

	it("403 si la fiche appartient à un autre utilisateur", async () => {
		p.characterSheet.findUnique.mockResolvedValue({
			id: SHEET,
			userId: OTHER,
			gameSystemId: GS,
			deletedAt: null,
		} as unknown);
		const r = await call("PATCH", `/character-sheets/${SHEET}/values`, {
			userId: USER,
			body,
		});
		expect(r.status).toBe(403);
		expect(p.characterSheetValue.upsert).not.toHaveBeenCalled();
	});

	it("400 si une propriété n'appartient pas au système de la fiche", async () => {
		p.characterSheet.findUnique.mockResolvedValue({
			id: SHEET,
			userId: USER,
			gameSystemId: GS,
			deletedAt: null,
		} as unknown);
		allowProps([PROP_B]); // PROP_A non autorisé
		const r = await call("PATCH", `/character-sheets/${SHEET}/values`, {
			userId: USER,
			body,
		});
		expect(r.status).toBe(400);
		expect(p.characterSheetValue.upsert).not.toHaveBeenCalled();
	});

	it("upsert le lot et renvoie les valeurs mises à jour", async () => {
		p.characterSheet.findUnique.mockResolvedValue({
			id: SHEET,
			userId: USER,
			gameSystemId: GS,
			deletedAt: null,
		} as unknown);
		allowProps([PROP_A, PROP_B]);

		const r = await call("PATCH", `/character-sheets/${SHEET}/values`, {
			userId: USER,
			body: [
				{ propertyId: PROP_A, value: "16" },
				{ propertyId: PROP_B, value: { current: 3, max: 4 } },
			],
		});
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		expect(p.characterSheetValue.upsert).toHaveBeenCalledTimes(2);

		const upsertArg = p.characterSheetValue.upsert.mock.calls[0]?.[0] as {
			where: { characterSheetId_propertyId: Record<string, string> };
			create: Record<string, unknown>;
			update: Record<string, unknown>;
		};
		expect(upsertArg.where.characterSheetId_propertyId).toEqual({
			characterSheetId: SHEET,
			propertyId: PROP_A,
		});
		expect(upsertArg.update.value).toBe("16");

		expect(r.json?.values).toEqual([
			{ propertyId: PROP_A, value: "16" },
			{ propertyId: PROP_B, value: { current: 3, max: 4 } },
		]);
	});
});

// ==================== DELETE /character-sheets/:id ====================

describe("DELETE /character-sheets/:id", () => {
	it("401 sans authentification", async () => {
		const r = await call("DELETE", `/character-sheets/${SHEET}`);
		expect(r.status).toBe(401);
	});

	it("404 si la fiche est introuvable", async () => {
		p.characterSheet.findUnique.mockResolvedValue(null as unknown);
		const r = await call("DELETE", `/character-sheets/${SHEET}`, {
			userId: USER,
		});
		expect(r.status).toBe(404);
		expect(p.characterSheet.update).not.toHaveBeenCalled();
	});

	it("404 si la fiche est déjà supprimée (idempotent)", async () => {
		p.characterSheet.findUnique.mockResolvedValue(
			aSheet({ deletedAt: new Date("2026-06-17T00:00:00Z") }) as unknown,
		);
		const r = await call("DELETE", `/character-sheets/${SHEET}`, {
			userId: USER,
		});
		expect(r.status).toBe(404);
		expect(p.characterSheet.update).not.toHaveBeenCalled();
	});

	it("403 si la fiche appartient à un autre utilisateur", async () => {
		p.characterSheet.findUnique.mockResolvedValue(
			aSheet({ userId: OTHER }) as unknown,
		);
		const r = await call("DELETE", `/character-sheets/${SHEET}`, {
			userId: USER,
		});
		expect(r.status).toBe(403);
		expect(p.characterSheet.update).not.toHaveBeenCalled();
	});

	it("soft-delete la fiche (deletedAt) et renvoie success", async () => {
		p.characterSheet.findUnique.mockResolvedValue(aSheet() as unknown);
		const r = await call("DELETE", `/character-sheets/${SHEET}`, {
			userId: USER,
		});
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);
		const arg = p.characterSheet.update.mock.calls[0]?.[0] as {
			where: { id: string };
			data: { deletedAt: Date };
		};
		expect(arg.where.id).toBe(SHEET);
		expect(arg.data.deletedAt).toBeInstanceOf(Date);
	});
});

// ==================== POST /character-sheets/:id/avatar ====================

describe("POST /character-sheets/:id/avatar", () => {
	async function callMultipart(path: string, userId?: string, file?: File) {
		const headers: Record<string, string> = {};
		if (userId) headers["x-user-id"] = userId;
		const form = new FormData();
		if (file) form.set("avatar", file);
		const res = await characterSheetsController.handle(
			new Request(`http://localhost${path}`, {
				method: "POST",
				headers,
				body: form,
			}),
		);
		const text = await res.text();
		return {
			status: res.status,
			json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
		};
	}

	it("401 sans authentification", async () => {
		const file = new File([new Uint8Array([1, 2, 3])], "t.png", {
			type: "image/png",
		});
		const r = await callMultipart(
			`/character-sheets/${SHEET}/avatar`,
			undefined,
			file,
		);
		expect(r.status).toBe(401);
	});

	it("400 si aucun fichier n'est envoyé", async () => {
		const r = await callMultipart(`/character-sheets/${SHEET}/avatar`, USER);
		expect(r.status).toBe(400);
	});
});
