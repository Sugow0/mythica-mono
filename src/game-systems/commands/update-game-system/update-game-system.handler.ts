import { prisma } from "../../../lib/prisma";
import type { UpdateGameSystemBody } from "./update-game-system.dto";

export type UpdateGameSystemResult =
	| { success: true }
	| { success: false; error: string };

export async function updateGameSystemHandler(
	gameSystemId: string,
	body: UpdateGameSystemBody,
): Promise<UpdateGameSystemResult> {
	const gameSystem = await prisma.gameSystems.findUnique({
		where: { id: gameSystemId },
		select: { id: true },
	});

	if (!gameSystem) {
		return { success: false, error: "Système de jeu introuvable" };
	}

	if (body.name) {
		const duplicate = await prisma.gameSystems.findFirst({
			where: { name: body.name, id: { not: gameSystemId } },
			select: { id: true },
		});

		if (duplicate) {
			return {
				success: false,
				error: "Un système de jeu avec ce nom existe déjà",
			};
		}
	}

	await prisma.gameSystems.update({
		where: { id: gameSystemId },
		data: body,
	});

	return { success: true };
}
