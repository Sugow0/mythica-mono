import { randomUUID } from "node:crypto";
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

// Prisma retourne gridOpacity en Decimal — on le normalise en number pour TypeBox.
function normalizeMap<T extends { gridOpacity: unknown }>(map: T) {
	return { ...map, gridOpacity: Number(map.gridOpacity) };
}

export async function getMaps(campaignId: string) {
	const maps = await prisma.map.findMany({
		where: { campaignId },
		orderBy: { createdAt: "asc" },
	});
	return maps.map(normalizeMap);
}

export async function getMap(mapId: string, campaignId: string) {
	const map = await prisma.map.findFirst({ where: { id: mapId, campaignId } });
	return map ? normalizeMap(map) : null;
}

export async function createMap(campaignId: string, data: CreateMapData) {
	const map = await prisma.map.create({
		data: { id: randomUUID(), campaignId, ...data },
	});
	return normalizeMap(map);
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
	const map = await prisma.map.update({ where: { id: mapId }, data });
	return normalizeMap(map);
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
	const map = await prisma.map.update({
		where: { id: mapId },
		data: { fileId },
	});
	return normalizeMap(map);
}
