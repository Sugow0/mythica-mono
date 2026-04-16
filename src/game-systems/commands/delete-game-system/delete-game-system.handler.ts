import { prisma } from "../../../lib/prisma";

export type DeleteGameSystemResult =
	| { success: true }
	| { success: false; error: string };

export async function deleteGameSystemHandler(
	gameSystemId: string,
): Promise<DeleteGameSystemResult> {
	const gameSystem = await prisma.gameSystems.findUnique({
		where: { id: gameSystemId },
		select: {
			id: true,
			_count: { select: { campaigns: true } },
		},
	});

	if (!gameSystem) {
		return { success: false, error: "Système de jeu introuvable" };
	}

	if (gameSystem._count.campaigns > 0) {
		return {
			success: false,
			error:
				"Impossible de supprimer un système de jeu utilisé par des campagnes",
		};
	}

	await prisma.gameSystems.delete({
		where: { id: gameSystemId },
	});

	return { success: true };
}
