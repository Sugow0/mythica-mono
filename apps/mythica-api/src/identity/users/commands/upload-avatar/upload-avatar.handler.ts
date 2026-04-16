import {
	isAllowedImageType,
	MAX_AVATAR_SIZE_BYTES,
	uploadUserAvatar,
} from "../../../../lib/minio";
import { prisma } from "../../../../lib/prisma";

export type UploadAvatarResult =
	| { success: true; avatarKey: string }
	| { success: false; error: string };

/**
 * Upload l'avatar d'un utilisateur : envoi vers Minio (bucket users, dossier userId)
 * et mise à jour du champ avatar en base.
 */
export async function uploadAvatarHandler(
	userId: string,
	data: Buffer,
	contentType: string,
): Promise<UploadAvatarResult> {
	if (!isAllowedImageType(contentType)) {
		return {
			success: false,
			error: "Type de fichier non autorisé. Utilisez JPEG, PNG ou WebP.",
		};
	}
	if (data.length > MAX_AVATAR_SIZE_BYTES) {
		return {
			success: false,
			error: `Fichier trop volumineux (max. ${MAX_AVATAR_SIZE_BYTES / 1024 / 1024} Mo).`,
		};
	}

	const avatarKey = await uploadUserAvatar(userId, data, contentType);
	await prisma.users.update({
		where: { id: userId },
		data: { avatar: avatarKey },
	});

	return { success: true, avatarKey };
}
