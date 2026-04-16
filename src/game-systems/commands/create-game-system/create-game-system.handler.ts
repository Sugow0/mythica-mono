import { prisma } from "../../../lib/prisma";
import type { CreateGameSystemBody } from "./create-game-system.dto";

export type CreateGameSystemResult =
	| { success: true; gameSystemId: string }
	| { success: false; error: string };

export async function createGameSystemHandler(
	body: CreateGameSystemBody,
): Promise<CreateGameSystemResult> {
	const existing = await prisma.gameSystems.findFirst({
		where: { name: body.name },
		select: { id: true },
	});

	if (existing) {
		return {
			success: false,
			error: "Un système de jeu avec ce nom existe déjà",
		};
	}

	const gameSystem = await prisma.gameSystems.create({
		data: {
			name: body.name,
			description: body.description,
		},
		select: { id: true },
	});

	return { success: true, gameSystemId: gameSystem.id };
}
