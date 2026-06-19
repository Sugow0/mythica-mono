import {
	getPresignedAvatarUrl,
	uploadCharacterAvatar,
} from "../../../lib/avatar-storage";
import { newId } from "../../../lib/id";
import { prisma } from "../../../lib/prisma";

const ALLOWED_AVATAR_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

/** Taille maximale d'un avatar : 5 Mo (le token est recadré côté client). */
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

/** Vrai si le type MIME est un avatar autorisé. */
export function isAllowedAvatarType(mime: string): boolean {
	return ALLOWED_AVATAR_MIME_TYPES.includes(
		mime as (typeof ALLOWED_AVATAR_MIME_TYPES)[number],
	);
}

export type UploadAvatarInput = {
	sheetId: string;
	userId: string;
	data: Buffer;
	contentType: string;
};

export type UploadAvatarResult =
	| { ok: true; fileId: string; avatarUrl: string | null }
	| { ok: false; status: 400 | 403 | 404; error: string };

/**
 * Upload l'avatar (token) d'une fiche de personnage.
 *
 * Réservé au propriétaire. Valide le type MIME et la taille, stocke le fichier
 * dans le stockage objet, crée l'enregistrement `File` (domaine `avatar`) et met
 * à jour `avatarFileId` de la fiche. Retourne l'identifiant du fichier et une
 * URL présignée pour affichage immédiat.
 */
export async function uploadAvatarHandler(
	input: UploadAvatarInput,
): Promise<UploadAvatarResult> {
	const { sheetId, userId, data, contentType } = input;

	const sheet = await prisma.characterSheet.findUnique({
		where: { id: sheetId },
		select: { id: true, userId: true, deletedAt: true },
	});
	if (!sheet || sheet.deletedAt) {
		return { ok: false, status: 404, error: "Fiche introuvable" };
	}
	if (sheet.userId !== userId) {
		return { ok: false, status: 403, error: "Accès refusé" };
	}
	if (!isAllowedAvatarType(contentType)) {
		return {
			ok: false,
			status: 400,
			error: "Type de fichier non autorisé. Utilisez JPEG, PNG ou WebP.",
		};
	}
	if (data.length > MAX_AVATAR_SIZE_BYTES) {
		return {
			ok: false,
			status: 400,
			error: `Fichier trop volumineux (max. ${MAX_AVATAR_SIZE_BYTES / 1024 / 1024} Mo).`,
		};
	}

	await uploadCharacterAvatar(sheetId, data, contentType);

	const fileId = newId();
	await prisma.$transaction([
		prisma.file.create({
			data: {
				id: fileId,
				ownerId: userId,
				domain: "avatar",
				displayName: "avatar",
				mimeType: contentType,
				sizeBytes: BigInt(data.length),
			},
		}),
		prisma.characterSheet.update({
			where: { id: sheetId },
			data: { avatarFileId: fileId },
		}),
	]);

	const avatarUrl = await getPresignedAvatarUrl(sheetId).catch(() => null);
	return { ok: true, fileId, avatarUrl };
}
