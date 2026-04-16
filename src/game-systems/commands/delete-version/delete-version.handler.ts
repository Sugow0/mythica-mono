import { prisma } from "../../../lib/prisma";

export type DeleteVersionResult =
	| { success: true }
	| { success: false; error: string };

export async function deleteVersionHandler(
	gameSystemId: string,
	versionId: string,
): Promise<DeleteVersionResult> {
	const version = await prisma.gameSystemVersions.findFirst({
		where: { id: versionId, gameSystemId },
		select: { id: true },
	});

	if (!version) {
		return { success: false, error: "Version introuvable" };
	}

	await prisma.gameSystemVersions.delete({
		where: { id: versionId },
	});

	return { success: true };
}
