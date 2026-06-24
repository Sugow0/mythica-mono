import { beforeEach, describe, expect, it, mock } from "bun:test";
import { duplicateCharacterSheet } from "../character-sheets.service";

const OWNER = "11111111-1111-1111-1111-111111111111";
const NEW_OWNER = "22222222-2222-2222-2222-222222222222";
const SOURCE_ID = "33333333-3333-3333-3333-333333333333";
const GS = "44444444-4444-4444-4444-444444444444";
const PROP = "55555555-5555-5555-5555-555555555555";
const CONTENT = "66666666-6666-6666-6666-666666666666";
const SEL_ID = "77777777-7777-7777-7777-777777777777";
const CHILD_SEL_ID = "88888888-8888-8888-8888-888888888888";

function makeDb(overrides: Record<string, unknown> = {}) {
	const created: unknown[] = [];
	const createdValues: unknown[] = [];
	const createdSelections: unknown[] = [];

	const txFn = mock(async (cb: (tx: unknown) => Promise<unknown>) => cb(db));

	const db = {
		characterSheet: {
			findUniqueOrThrow: mock(async () => ({
				id: SOURCE_ID,
				userId: OWNER,
				gameSystemId: GS,
				name: "Kael",
				avatarFileId: null,
				gold: 50,
				abilityMethod: "point_buy",
				values: [{ id: "v1", propertyId: PROP, value: { v: 10 } }],
				selections: [
					{
						id: SEL_ID,
						collectionKey: "race",
						contentId: CONTENT,
						level: null,
						isPrimary: null,
						parentSelectionId: null,
						qty: null,
						extra: null,
					},
				],
			})),
			create: mock(async (args: unknown) => {
				created.push(args);
				return {};
			}),
		},
		characterSheetValue: {
			createMany: mock(async (args: unknown) => {
				createdValues.push(args);
				return { count: 1 };
			}),
		},
		characterSheetSelection: {
			createMany: mock(async (args: unknown) => {
				createdSelections.push(args);
				return { count: 1 };
			}),
		},
		$transaction: txFn,
		...overrides,
	};

	return { db, created, createdValues, createdSelections };
}

describe("duplicateCharacterSheet", () => {
	it("crée un nouveau CharacterSheet avec le bon propriétaire", async () => {
		const { db, created } = makeDb();
		const newId = await duplicateCharacterSheet(
			SOURCE_ID,
			NEW_OWNER,
			db as never,
		);

		expect(typeof newId).toBe("string");
		expect(newId).not.toBe(SOURCE_ID);
		const createCall = (created[0] as { data: { userId: string } }).data;
		expect(createCall.userId).toBe(NEW_OWNER);
	});

	it("copie les valeurs avec de nouveaux ids", async () => {
		const { db, createdValues } = makeDb();
		const newSheetId = await duplicateCharacterSheet(
			SOURCE_ID,
			NEW_OWNER,
			db as never,
		);

		const data = (
			createdValues[0] as {
				data: { characterSheetId: string; propertyId: string }[];
			}
		).data;
		expect(data).toHaveLength(1);
		expect(data[0].characterSheetId).toBe(newSheetId);
		expect(data[0].propertyId).toBe(PROP);
	});

	it("copie les sélections avec de nouveaux ids", async () => {
		const { db, createdSelections } = makeDb();
		const newSheetId = await duplicateCharacterSheet(
			SOURCE_ID,
			NEW_OWNER,
			db as never,
		);

		const data = (
			createdSelections[0] as {
				data: { characterSheetId: string; id: string }[];
			}
		).data;
		expect(data).toHaveLength(1);
		expect(data[0].characterSheetId).toBe(newSheetId);
		expect(data[0].id).not.toBe(SEL_ID);
	});

	it("remplace parentSelectionId par le nouvel id de la sélection parente", async () => {
		const { db, createdSelections } = makeDb({
			characterSheet: {
				findUniqueOrThrow: mock(async () => ({
					id: SOURCE_ID,
					userId: OWNER,
					gameSystemId: GS,
					name: "Kael",
					avatarFileId: null,
					gold: null,
					abilityMethod: null,
					values: [],
					selections: [
						{
							id: SEL_ID,
							collectionKey: "race",
							contentId: CONTENT,
							level: null,
							isPrimary: null,
							parentSelectionId: null,
							qty: null,
							extra: null,
						},
						{
							id: CHILD_SEL_ID,
							collectionKey: "sous-race",
							contentId: CONTENT,
							level: null,
							isPrimary: null,
							parentSelectionId: SEL_ID,
							qty: null,
							extra: null,
						},
					],
				})),
				create: mock(async () => ({})),
			},
		});

		await duplicateCharacterSheet(SOURCE_ID, NEW_OWNER, db as never);

		const data = (
			createdSelections[0] as {
				data: { id: string; parentSelectionId: string | null }[];
			}
		).data;
		const parent = data.find((s) => s.parentSelectionId === null);
		const child = data.find((s) => s.parentSelectionId !== null);

		expect(parent).toBeDefined();
		expect(child).toBeDefined();
		expect(child!.parentSelectionId).toBe(parent!.id);
	});

	it("ne crée pas de valeurs ni de sélections si la source est vide", async () => {
		const { db, createdValues, createdSelections } = makeDb({
			characterSheet: {
				findUniqueOrThrow: mock(async () => ({
					id: SOURCE_ID,
					userId: OWNER,
					gameSystemId: GS,
					name: "Vide",
					avatarFileId: null,
					gold: null,
					abilityMethod: null,
					values: [],
					selections: [],
				})),
				create: mock(async () => ({})),
			},
		});

		await duplicateCharacterSheet(SOURCE_ID, NEW_OWNER, db as never);

		expect(createdValues).toHaveLength(0);
		expect(createdSelections).toHaveLength(0);
	});

	it("propage les erreurs de la source introuvable", async () => {
		const { db } = makeDb({
			characterSheet: {
				findUniqueOrThrow: mock(async () => {
					throw new Error("Not found");
				}),
				create: mock(async () => ({})),
			},
		});

		await expect(
			duplicateCharacterSheet("bad-id", NEW_OWNER, db as never),
		).rejects.toThrow("Not found");
	});
});
