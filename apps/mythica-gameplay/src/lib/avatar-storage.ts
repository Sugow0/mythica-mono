import { minioClient } from "./cover-storage";

// Stockage objet S3-compatible (RustFS) pour les avatars/tokens de personnage.
// Réutilise le client Minio partagé (mêmes variables RUSTFS_*/MINIO_*).
export const BUCKET_AVATARS =
	process.env.RUSTFS_BUCKET_AVATARS ??
	process.env.MINIO_BUCKET_AVATARS ??
	"avatars";

/** Clé objet déterministe pour l'avatar d'une fiche : `sheetId/avatar`. */
export function avatarObjectKey(sheetId: string): string {
	return `${sheetId}/avatar`;
}

/** Vérifie que le bucket existe et le crée si besoin. */
async function ensureBucket(bucket: string): Promise<void> {
	const exists = await minioClient.bucketExists(bucket);
	if (!exists) {
		await minioClient.makeBucket(bucket);
	}
}

/**
 * Upload l'avatar (token déjà recadré côté client) d'une fiche dans le bucket
 * avatars, sous la clé déterministe `sheetId/avatar` (écrase l'éventuel avatar
 * précédent). Retourne la clé objet.
 */
export async function uploadCharacterAvatar(
	sheetId: string,
	data: Buffer,
	contentType: string,
): Promise<string> {
	await ensureBucket(BUCKET_AVATARS);
	const objectName = avatarObjectKey(sheetId);
	await minioClient.putObject(BUCKET_AVATARS, objectName, data, data.length, {
		"Content-Type": contentType,
	});
	return objectName;
}

/**
 * Génère une URL présignée pour lire l'avatar d'une fiche (affichage dans le
 * front). Valide 1 heure par défaut.
 */
export async function getPresignedAvatarUrl(
	sheetId: string,
	expirySeconds = 3600,
): Promise<string> {
	return minioClient.presignedGetObject(
		BUCKET_AVATARS,
		avatarObjectKey(sheetId),
		expirySeconds,
	);
}
