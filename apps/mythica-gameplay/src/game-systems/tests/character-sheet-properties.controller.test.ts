import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	characterSheetProperty: {
		findUnique: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
	},
};

mock.module("../../lib/prisma", () => ({ prisma: p }));

const { characterSheetPropertiesController } =
	require("../character-sheet-properties.controller") as typeof import("../character-sheet-properties.controller");

const USER = "11111111-1111-1111-1111-111111111111";
const EXISTING_ID = "99999999-9999-9999-9999-999999999999";

type CallOpts = { userId?: string; body?: unknown };

async function call(method: string, path: string, opts: CallOpts = {}) {
	const headers: Record<string, string> = {};
	if (opts.userId) headers["x-user-id"] = opts.userId;
	let body: string | undefined;
	if (opts.body !== undefined) {
		headers["content-type"] = "application/json";
		body = JSON.stringify(opts.body);
	}
	const res = await characterSheetPropertiesController.handle(
		new Request(`http://localhost${path}`, { method, headers, body }),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

beforeEach(() => {
	for (const fn of Object.values(p.characterSheetProperty)) {
		(fn as ReturnType<typeof mock>).mockReset();
	}
	p.characterSheetProperty.findUnique.mockResolvedValue(null as unknown);
	p.characterSheetProperty.create.mockResolvedValue({
		id: "created-id",
	} as unknown);
});

const validBody = {
	key: "force",
	label: "Force",
	type: "number" as const,
	defaultValue: "10",
	description: "Caractéristique de force",
};

describe("POST /character-sheet-properties", () => {
	it("refuse sans authentification (401)", async () => {
		const r = await call("POST", "/character-sheet-properties", {
			body: validBody,
		});
		expect(r.status).toBe(401);
		expect(p.characterSheetProperty.create).not.toHaveBeenCalled();
	});

	it("crée une nouvelle propriété (201) avec id généré et champs", async () => {
		const r = await call("POST", "/character-sheet-properties", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(201);
		expect(r.json?.success).toBe(true);
		expect(typeof r.json?.id).toBe("string");

		expect(p.characterSheetProperty.findUnique).toHaveBeenCalledTimes(1);
		expect(p.characterSheetProperty.create).toHaveBeenCalledTimes(1);
		const arg = p.characterSheetProperty.create.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(typeof arg.data.id).toBe("string");
		expect((arg.data.id as string).length).toBeGreaterThan(0);
		expect(arg.data.key).toBe("force");
		expect(arg.data.label).toBe("Force");
		expect(arg.data.type).toBe("number");
		expect(arg.data.defaultValue).toBe("10");
		expect(arg.data.description).toBe("Caractéristique de force");
	});

	it("crée une propriété select avec options (201)", async () => {
		const r = await call("POST", "/character-sheet-properties", {
			userId: USER,
			body: {
				key: "alignement",
				label: "Alignement",
				type: "select",
				options: { values: ["loyal", "neutre", "chaotique"] },
			},
		});
		expect(r.status).toBe(201);
		const arg = p.characterSheetProperty.create.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(arg.data.options).toEqual({
			values: ["loyal", "neutre", "chaotique"],
		});
		// champs optionnels absents -> null
		expect(arg.data.defaultValue).toBeNull();
		expect(arg.data.description).toBeNull();
	});

	it("renvoie 409 + existingId si la key existe déjà (sans créer)", async () => {
		p.characterSheetProperty.findUnique.mockResolvedValue({
			id: EXISTING_ID,
			key: "force",
		} as unknown);
		const r = await call("POST", "/character-sheet-properties", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(409);
		expect(r.json?.success).toBe(false);
		expect(r.json?.existingId).toBe(EXISTING_ID);
		expect(typeof r.json?.error).toBe("string");
		expect(p.characterSheetProperty.create).not.toHaveBeenCalled();
	});

	it("renvoie 409 si la création lève P2002 (course)", async () => {
		p.characterSheetProperty.findUnique.mockResolvedValue(null as unknown);
		p.characterSheetProperty.create.mockRejectedValue({ code: "P2002" });
		const r = await call("POST", "/character-sheet-properties", {
			userId: USER,
			body: validBody,
		});
		expect(r.status).toBe(409);
		expect(r.json?.success).toBe(false);
		expect(p.characterSheetProperty.create).toHaveBeenCalledTimes(1);
	});

	it("rejette un type invalide (422 de validation)", async () => {
		const r = await call("POST", "/character-sheet-properties", {
			userId: USER,
			body: { key: "k", label: "L", type: "invalide" },
		});
		expect(r.status).toBe(422);
	});
});
