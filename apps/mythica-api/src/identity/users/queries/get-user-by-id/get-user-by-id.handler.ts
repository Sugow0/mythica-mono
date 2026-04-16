import { prisma } from "../../../../lib/prisma";
import { type PublicUser, publicUserSelect } from "../../public-user.select";

export type GetUserByIdResult =
	| { success: true; user: PublicUser }
	| { success: false; error: string };

/**
 * Query : récupère un utilisateur par son id (champs publics uniquement).
 */
export async function getUserByIdHandler(
	userId: string,
): Promise<GetUserByIdResult> {
	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: publicUserSelect,
	});

	if (!user) {
		return { success: false, error: "Utilisateur non trouvé" };
	}

	return { success: true, user };
}
