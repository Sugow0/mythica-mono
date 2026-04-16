import { prisma } from "../../../lib/prisma";

export type GetGameSystemByIdResult =
	| { success: true; gameSystem: Record<string, unknown> }
	| { success: false; error: string };

export async function getGameSystemByIdHandler(
	id: string,
): Promise<GetGameSystemByIdResult> {
	const gameSystem = await prisma.gameSystems.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			description: true,
			gameSystemVersions: {
				select: {
					id: true,
					version: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: { createdAt: "desc" },
			},
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!gameSystem) {
		return { success: false, error: "Système de jeu introuvable" };
	}

	return { success: true, gameSystem };
}
