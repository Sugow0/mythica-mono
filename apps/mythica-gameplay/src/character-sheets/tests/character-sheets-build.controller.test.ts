import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	characterSheet: {
		findUnique: mock(async () => null as unknown),
		update: mock(async () => ({}) as unknown),
	},
	systemContent: {
		findMany: mock(async () => [] as unknown[]),
	},
	gameSystemCreationStep: {
		findFirst: mock(async () => null as unknown),
	},
	gameSystemProperty: {
		findMany: mock(async () => [] as unknown[]),
	},
	characterSheetSelection: {
		deleteMany: mock(async () => ({ count: 0 }) as unknown),
		createMany: mock(async () => ({ count: 0 }) as unknown),
	},
	characterSheetValue: {
		upsert: mock(async () => ({}) as unknown),
	},
	$transaction: mock(async (arg: unknown) => {
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

async function build(body: unknown, userId?: string) {
	const headers: Record<string, string> = {
		"content-type": "application/json",
	};
	if (userId) headers["x-user-id"] = userId;
	const res = await characterSheetsController.handle(
		new Request(`http://localhost/character-sheets/${SHEET}/build`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		}),
	);
	const text = await res.text();
	return {
		status: res.status,
		json: text ? (JSON.parse(text) as Record<string, unknown>) : null,
	};
}

const CONTENT = [
	{
		id: "r1",
		collectionKey: "race",
		slug: "haut-elfe",
		name: "Haut-elfe",
		data: {
			abilityBonuses: { dexterite: 2, intelligence: 1 },
			speed: 9,
			skillProficiencies: ["perception"],
		},
	},
	{
		id: "c-mag",
		collectionKey: "classe",
		slug: "magicien",
		name: "Magicien",
		data: { casterType: "full", multiclassPrereq: { intelligence: 13 } },
	},
	{
		id: "c-gue",
		collectionKey: "classe",
		slug: "guerrier",
		name: "Guerrier",
		data: { casterType: "none", multiclassPrereq: { force: 13 } },
	},
	{
		id: "b-sage",
		collectionKey: "background",
		slug: "sage",
		name: "Sage",
		data: { skillProficiencies: ["arcanes", "histoire"] },
	},
	{
		id: "sp1",
		collectionKey: "sort",
		slug: "projectile-magique",
		name: "Projectile magique",
		data: {},
	},
	{
		id: "eq1",
		collectionKey: "equipement",
		slug: "grimoire",
		name: "Grimoire",
		data: {},
	},
];

const PROP_KEYS = [
	"force",
	"dexterite",
	"constitution",
	"intelligence",
	"sagesse",
	"charisme",
	"niveau",
	"vitesse",
	"perception",
	"arcanes",
	"histoire",
	"apparence",
];

const ALLOC_CONFIG = {
	pointBuyPool: 27,
	pointBuyCostTable: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
	minScore: 8,
	maxScore: 15,
	standardArray: [15, 14, 13, 12, 10, 8],
};

const baseScores = {
	force: 8,
	dexterite: 13,
	constitution: 12,
	intelligence: 15,
	sagesse: 10,
	charisme: 8,
};

beforeEach(() => {
	for (const m of [
		p.characterSheet.findUnique,
		p.characterSheet.update,
		p.systemContent.findMany,
		p.gameSystemCreationStep.findFirst,
		p.gameSystemProperty.findMany,
		p.characterSheetSelection.deleteMany,
		p.characterSheetSelection.createMany,
		p.characterSheetValue.upsert,
	]) {
		m.mockReset();
	}
	p.characterSheet.findUnique.mockResolvedValue({
		id: SHEET,
		userId: USER,
		gameSystemId: GS,
		deletedAt: null,
	} as unknown);
	p.characterSheet.update.mockResolvedValue({} as unknown);
	p.systemContent.findMany.mockResolvedValue(CONTENT as unknown[]);
	p.gameSystemCreationStep.findFirst.mockResolvedValue({
		config: ALLOC_CONFIG,
	} as unknown);
	p.gameSystemProperty.findMany.mockResolvedValue(
		PROP_KEYS.map((key) => ({
			propertyId: `pid-${key}`,
			property: { key },
		})) as unknown[],
	);
	p.characterSheetSelection.deleteMany.mockResolvedValue({
		count: 0,
	} as unknown);
	p.characterSheetSelection.createMany.mockResolvedValue({
		count: 0,
	} as unknown);
	p.characterSheetValue.upsert.mockResolvedValue({} as unknown);
});

const singleClassBody = {
	raceSlug: "haut-elfe",
	classes: [{ slug: "magicien", level: 3, isPrimary: true }],
	backgroundSlug: "sage",
	abilityMethod: "manual",
	abilityScores: baseScores,
	skillProficiencies: ["arcanes"],
	spellSlugs: ["projectile-magique"],
	inventory: [{ slug: "grimoire", qty: 1 }],
	gold: 50,
	lore: { apparence: "Grand et élancé" },
};

describe("POST /character-sheets/:id/build", () => {
	it("401 sans authentification", async () => {
		const r = await build(singleClassBody);
		expect(r.status).toBe(401);
	});

	it("404 si la fiche est introuvable", async () => {
		p.characterSheet.findUnique.mockResolvedValue(null as unknown);
		const r = await build(singleClassBody, USER);
		expect(r.status).toBe(404);
	});

	it("403 si la fiche appartient à un autre utilisateur", async () => {
		const r = await build(singleClassBody, OTHER);
		expect(r.status).toBe(403);
	});

	it("400 si une référence de contenu est invalide", async () => {
		const r = await build(
			{ ...singleClassBody, raceSlug: "inexistante" },
			USER,
		);
		expect(r.status).toBe(400);
	});

	it("400 si la répartition point_buy dépasse le budget", async () => {
		const r = await build(
			{
				...singleClassBody,
				abilityMethod: "point_buy",
				abilityScores: {
					force: 15,
					dexterite: 15,
					constitution: 15,
					intelligence: 15,
					sagesse: 15,
					charisme: 15,
				},
			},
			USER,
		);
		expect(r.status).toBe(400);
	});

	it("400 si un prérequis de multiclassage n'est pas respecté", async () => {
		const r = await build(
			{
				...singleClassBody,
				classes: [
					{ slug: "magicien", level: 2, isPrimary: true },
					{ slug: "guerrier", level: 1 },
				],
			},
			USER,
		);
		// force finale = 8 < 13 requis par guerrier
		expect(r.status).toBe(400);
		expect(String(r.json?.error)).toContain("multiclassage");
	});

	it("200 persiste les sélections et projette les valeurs", async () => {
		const r = await build(singleClassBody, USER);
		expect(r.status).toBe(200);
		expect(r.json?.success).toBe(true);

		// Sélections créées (race, background, classe, sort, équipement)
		const selArg = p.characterSheetSelection.createMany.mock.calls[0]?.[0] as {
			data: Array<Record<string, unknown>>;
		};
		const byKey = new Map(
			selArg.data.map((s) => [`${s.collectionKey}:${s.contentId}`, s]),
		);
		expect(byKey.has("race:r1")).toBe(true);
		expect(byKey.has("background:b-sage")).toBe(true);
		expect(byKey.get("classe:c-mag")?.level).toBe(3);
		expect(byKey.get("classe:c-mag")?.isPrimary).toBe(true);
		expect(byKey.has("sort:sp1")).toBe(true);
		expect(byKey.get("equipement:eq1")?.qty).toBe(1);

		// Or + méthode sur la fiche
		const updArg = p.characterSheet.update.mock.calls[0]?.[0] as {
			data: { gold: number; abilityMethod: string };
		};
		expect(updArg.data.gold).toBe(50);
		expect(updArg.data.abilityMethod).toBe("manual");

		// Projection des valeurs : scores finaux (base + bonus raciaux), niveau,
		// vitesse, maîtrises (race + background + choisies), lore.
		const valByProp = new Map<string, unknown>();
		for (const c of p.characterSheetValue.upsert.mock.calls) {
			const a = c[0] as {
				where: { characterSheetId_propertyId: { propertyId: string } };
				create: { value: unknown };
			};
			valByProp.set(
				a.where.characterSheetId_propertyId.propertyId,
				a.create.value,
			);
		}
		expect(valByProp.get("pid-dexterite")).toBe(15); // 13 + 2
		expect(valByProp.get("pid-intelligence")).toBe(16); // 15 + 1
		expect(valByProp.get("pid-niveau")).toBe(3);
		expect(valByProp.get("pid-vitesse")).toBe(9);
		expect(valByProp.get("pid-perception")).toBe(true); // accordée par la race
		expect(valByProp.get("pid-arcanes")).toBe(true); // background + choix
		expect(valByProp.get("pid-histoire")).toBe(true); // background
		expect(valByProp.get("pid-apparence")).toBe("Grand et élancé");
	});
});
