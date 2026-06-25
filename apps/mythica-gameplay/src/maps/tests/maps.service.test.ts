import { describe, expect, it, mock } from "bun:test";

const p = {
	map: {
		findMany: mock(async () => [] as unknown[]),
		findFirst: mock(async () => null as unknown),
		create: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
		delete: mock(async () => ({}) as unknown),
	},
};
mock.module("../../lib/prisma", () => ({ prisma: p }));

const { getMaps, getMap, createMap, updateMap, deleteMap, setMapFile } =
	require("../maps.service") as typeof import("../maps.service");

const CID = "11111111-1111-1111-1111-111111111111";
const MID = "22222222-2222-2222-2222-222222222222";

const baseMap = {
	id: MID,
	campaignId: CID,
	nom: "Taverne",
	fileId: null,
	gridType: "square",
	gridSize: 100,
	gridOffsetX: 0,
	gridOffsetY: 0,
	gridColor: "#ffffff33",
	gridOpacity: 0.3,
	widthPx: 2000,
	heightPx: 2000,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe("getMaps", () => {
	it("retourne la liste des maps d'une campagne", async () => {
		p.map.findMany.mockResolvedValue([baseMap]);
		const result = await getMaps(CID);
		expect(result).toHaveLength(1);
		expect(result[0].nom).toBe("Taverne");
		expect(p.map.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { campaignId: CID } }),
		);
	});
});

describe("getMap", () => {
	it("retourne la map si elle appartient à la campagne", async () => {
		p.map.findFirst.mockResolvedValue(baseMap);
		const result = await getMap(MID, CID);
		expect(result?.id).toBe(MID);
	});

	it("retourne null si la map n'existe pas dans la campagne", async () => {
		p.map.findFirst.mockResolvedValue(null);
		const result = await getMap(MID, CID);
		expect(result).toBeNull();
	});
});

describe("createMap", () => {
	it("crée une map avec les valeurs par défaut", async () => {
		p.map.create.mockResolvedValue({ ...baseMap, nom: "Donjon" });
		const result = await createMap(CID, { nom: "Donjon" });
		expect(result.nom).toBe("Donjon");
		const arg = p.map.create.mock.calls[0]?.[0] as {
			data: { id: string; nom: string };
		};
		expect(arg.data.nom).toBe("Donjon");
		expect(arg.data.id).toMatch(/^[0-9a-f-]{36}$/);
	});
});

describe("updateMap", () => {
	it("met à jour une map existante", async () => {
		p.map.findFirst.mockResolvedValue(baseMap);
		p.map.update.mockResolvedValue({ ...baseMap, nom: "Forêt" });
		const result = await updateMap(MID, CID, { nom: "Forêt" });
		expect(result?.nom).toBe("Forêt");
	});

	it("retourne null si la map n'appartient pas à la campagne", async () => {
		p.map.findFirst.mockResolvedValue(null);
		const result = await updateMap(MID, CID, { nom: "Forêt" });
		expect(result).toBeNull();
	});
});

describe("deleteMap", () => {
	it("supprime la map si elle appartient à la campagne", async () => {
		p.map.findFirst.mockResolvedValue(baseMap);
		const ok = await deleteMap(MID, CID);
		expect(ok).toBe(true);
		expect(p.map.delete).toHaveBeenCalled();
	});

	it("retourne false si la map n'appartient pas à la campagne", async () => {
		p.map.findFirst.mockResolvedValue(null);
		const ok = await deleteMap(MID, CID);
		expect(ok).toBe(false);
	});
});

describe("setMapFile", () => {
	it("met à jour le fileId de la map", async () => {
		const newFileId = "33333333-3333-3333-3333-333333333333";
		p.map.update.mockResolvedValue({ ...baseMap, fileId: newFileId });
		const result = await setMapFile(MID, newFileId);
		expect(result.fileId).toBe(newFileId);
		expect(p.map.update).toHaveBeenCalledWith({
			where: { id: MID },
			data: { fileId: newFileId },
		});
	});

	it("peut définir fileId à null", async () => {
		p.map.update.mockResolvedValue({ ...baseMap, fileId: null });
		const result = await setMapFile(MID, null);
		expect(result.fileId).toBeNull();
	});
});
