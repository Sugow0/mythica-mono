import { prisma } from "../../../lib/prisma";
import type { CreateVersionBody } from "./create-version.dto";

export type CreateVersionResult =
	| { success: true; versionId: string }
	| { success: false; error: string };

export async function createVersionHandler(
	gameSystemId: string,
	body: CreateVersionBody,
): Promise<CreateVersionResult> {
	const gameSystem = await prisma.gameSystems.findUnique({
		where: { id: gameSystemId },
		select: { id: true },
	});

	if (!gameSystem) {
		return { success: false, error: "Système de jeu introuvable" };
	}

	const existing = await prisma.gameSystemVersions.findUnique({
		where: {
			gameSystemId_version: {
				gameSystemId,
				version: body.version,
			},
		},
		select: { id: true },
	});

	if (existing) {
		return {
			success: false,
			error: "Cette version existe déjà pour ce système de jeu",
		};
	}

	const version = await prisma.gameSystemVersions.create({
		data: {
			gameSystemId,
			version: body.version,
		},
		select: { id: true },
	});

	return { success: true, versionId: version.id };
}
