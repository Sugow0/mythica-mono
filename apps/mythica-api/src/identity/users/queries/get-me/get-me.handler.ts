import { prisma } from "../../../../lib/prisma";
import { type PublicUser, publicUserSelect } from "../../public-user.select";

export type GetMeResult =
	| { success: true; user: GetMeUser }
	| { success: false; error: string };

export type GetMeUser = PublicUser & {
	email: string;
	role: string;
};

/**
 * Query : récupère les infos du compte courant (utilisateur authentifié).
 * Retourne les champs publics + email et role (réservés au propriétaire).
 */
export async function getMeHandler(userId: string): Promise<GetMeResult> {
	const user = await prisma.users.findUnique({
		where: { id: userId },
		select: {
			...publicUserSelect,
			email: true,
			role: true,
		},
	});

	if (!user) {
		return { success: false, error: "Utilisateur non trouvé" };
	}

	return {
		success: true,
		user: user as GetMeUser,
	};
}
