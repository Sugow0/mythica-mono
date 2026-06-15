import { prisma } from "../../../../lib/prisma";
import { publishUserEvent } from "../../../../lib/user-events";
import { publicUserSelect } from "../../public-user.select";
import type { GetMeUser } from "../../queries/get-me/get-me.handler";
import type { UpdateProfileBody } from "./update-profile.dto";

export type UpdateProfileResult =
	| { success: true; user: GetMeUser }
	| { success: false; error: string };

/**
 * Met à jour le profil de l'utilisateur : pseudo et/ou bio.
 * Vérifie l'unicité du pseudo s'il est modifié.
 */
export async function updateProfileHandler(
	userId: string,
	body: UpdateProfileBody,
): Promise<UpdateProfileResult> {
	const data: { pseudo?: string; bio?: string | null } = {};

	if (body.pseudo !== undefined) {
		const existing = await prisma.users.findUnique({
			where: { pseudo: body.pseudo },
			select: { id: true },
		});
		if (existing && existing.id !== userId) {
			return { success: false, error: "Ce pseudo est déjà utilisé." };
		}
		data.pseudo = body.pseudo;
	}

	if (body.bio !== undefined) {
		data.bio = body.bio;
	}

	if (Object.keys(data).length === 0) {
		return { success: false, error: "Aucune modification fournie." };
	}

	const user = await prisma.users.update({
		where: { id: userId },
		data,
		select: {
			...publicUserSelect,
			email: true,
			role: true,
		},
	});

	// Propage le nouveau pseudo aux miroirs des autres services.
	if (data.pseudo !== undefined) {
		await publishUserEvent("user.updated", userId, { pseudo: data.pseudo });
	}

	return { success: true, user: user as GetMeUser };
}
