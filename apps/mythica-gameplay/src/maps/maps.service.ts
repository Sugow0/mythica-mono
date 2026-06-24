import { prisma } from "../lib/prisma";

type CreateMapData = {
	nom: string;
	gridType?: "square" | "hex" | "free";
	gridSize?: number;
	gridOffsetX?: number;
	gridOffsetY?: number;
	gridColor?: string;
	gridOpacity?: number;
	widthPx?: number;
	heightPx?: number;
};

export async function getMaps(campaignId: string) {
	return prisma.map.findMany({
		where: { campaignId },
		orderBy: { createdAt: "asc" },
	});
}

export async function getMap(mapId: string, campaignId: string) {
	return prisma.map.findFirst({ where: { id: mapId, campaignId } });
}

export async function createMap(campaignId: string, data: CreateMapData) {
	return prisma.map.create({ data: { campaignId, ...data } });
}

export async function updateMap(
	mapId: string,
	campaignId: string,
	data: Partial<CreateMapData>,
) {
	const existing = await prisma.map.findFirst({
		where: { id: mapId, campaignId },
	});
	if (!existing) return null;
	return prisma.map.update({ where: { id: mapId }, data });
}

export async function deleteMap(mapId: string, campaignId: string) {
	const existing = await prisma.map.findFirst({
		where: { id: mapId, campaignId },
	});
	if (!existing) return false;
	await prisma.map.delete({ where: { id: mapId } });
	return true;
}

export async function setMapFile(mapId: string, fileId: string | null) {
	return prisma.map.update({ where: { id: mapId }, data: { fileId } });
}
