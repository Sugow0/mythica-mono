import { prisma } from "../../../lib/prisma";
import type { UpdateVersionBody } from "./update-version.dto";

export type UpdateVersionResult =
	| { success: true }
	| { success: false; error: string };

export async function updateVersionHandler(
	gameSystemId: string,
	versionId: string,
	body: UpdateVersionBody,
): Promise<UpdateVersionResult> {
	const version = await prisma.gameSystemVersions.findFirst({
		where: { id: versionId, gameSystemId },
		select: { id: true },
	});

	if (!version) {
		return { success: false, error: "Version introuvable" };
	}

	const duplicate = await prisma.gameSystemVersions.findFirst({
		where: {
			gameSystemId,
			version: body.version,
			id: { not: versionId },
		},
		select: { id: true },
	});

	if (duplicate) {
		return {
			success: false,
			error: "Cette version existe déjà pour ce système de jeu",
		};
	}

	await prisma.gameSystemVersions.update({
		where: { id: versionId },
		data: { version: body.version },
	});

	return { success: true };
}
