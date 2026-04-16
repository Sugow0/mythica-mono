import * as Minio from "minio";

const endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:34000";
const url = new URL(endpoint);
const useSSL = url.protocol === "https:";
const port = url.port ? Number.parseInt(url.port, 10) : useSSL ? 443 : 80;

export const minioClient = new Minio.Client({
	endPoint: url.hostname,
	port,
	useSSL,
	accessKey: process.env.MINIO_USER_ROOT ?? "admin",
	secretKey: process.env.MINIO_PASSWORD_ROOT ?? "password123!",
});

export const BUCKET_USERS = process.env.MINIO_BUCKET_USERS ?? "users";

/** Vérifie que le bucket existe et le crée si besoin. */
export async function ensureBucket(bucket: string): Promise<void> {
	const exists = await minioClient.bucketExists(bucket);
	if (!exists) {
		await minioClient.makeBucket(bucket);
	}
}

/** Préfixe (dossier) dans le bucket pour un utilisateur : `userId/` */
export function userPrefix(userId: string): string {
	return `${userId}/`;
}

/** Clé objet pour l'avatar : `userId/profile.{ext}` */
export function profileObjectKey(userId: string, extension: string): string {
	const ext = extension.startsWith(".") ? extension.slice(1) : extension;
	return `${userId}/profile.${ext}`;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export function isAllowedImageType(mime: string): boolean {
	return ALLOWED_IMAGE_TYPES.includes(
		mime as (typeof ALLOWED_IMAGE_TYPES)[number],
	);
}

export function getExtensionFromMime(mime: string): string {
	const map: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
	};
	return map[mime] ?? "jpg";
}

export const MAX_AVATAR_SIZE_BYTES = MAX_SIZE_BYTES;
export const ALLOWED_AVATAR_MIME_TYPES = [...ALLOWED_IMAGE_TYPES];

/**
 * Upload l'avatar d'un utilisateur dans le bucket users, sous le dossier userId.
 * Retourne la clé objet (ex: userId/profile.jpg).
 */
export async function uploadUserAvatar(
	userId: string,
	data: Buffer,
	contentType: string,
): Promise<string> {
	await ensureBucket(BUCKET_USERS);
	const ext = getExtensionFromMime(contentType);
	const objectName = profileObjectKey(userId, ext);
	await minioClient.putObject(BUCKET_USERS, objectName, data, data.length, {
		"Content-Type": contentType,
	});
	return objectName;
}

/**
 * Génère une URL présignée pour lire l'avatar (ex: affichage dans le front).
 * Valide 1 heure par défaut.
 */
export async function getPresignedAvatarUrl(
	objectKey: string,
	expirySeconds = 3600,
): Promise<string> {
	return minioClient.presignedGetObject(BUCKET_USERS, objectKey, expirySeconds);
}
