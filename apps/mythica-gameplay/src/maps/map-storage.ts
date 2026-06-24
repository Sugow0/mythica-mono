import * as Minio from "minio";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";

// Stockage objet S3-compatible (RustFS) pour les images de maps.
// Même convention que cover-storage.ts : priorité aux variables RUSTFS_*,
// repli sur MINIO_* pour rétrocompatibilité.
const endpoint =
	process.env.RUSTFS_ENDPOINT ??
	process.env.MINIO_ENDPOINT ??
	"http://localhost:24000";
const url = new URL(endpoint);
const useSSL = url.protocol === "https:";
const port = url.port ? Number.parseInt(url.port, 10) : useSSL ? 443 : 80;

const minioClient = new Minio.Client({
	endPoint: url.hostname,
	port,
	useSSL,
	accessKey:
		process.env.RUSTFS_USER_ROOT ?? process.env.MINIO_USER_ROOT ?? "admin",
	secretKey:
		process.env.RUSTFS_PASSWORD_ROOT ??
		process.env.MINIO_PASSWORD_ROOT ??
		"password123!",
});

const BUCKET_MAPS =
	process.env.RUSTFS_BUCKET_CAMPAIGNS ??
	process.env.MINIO_BUCKET_CAMPAIGNS ??
	"campaigns";

/** Clé objet déterministe pour l'image de fond d'une map. */
export function mapObjectKey(campaignId: string, mapId: string): string {
	return `${campaignId}/maps/${mapId}`;
}

/** Vérifie que le bucket existe et le crée si besoin. */
async function ensureBucket(bucket: string): Promise<void> {
	const exists = await minioClient.bucketExists(bucket);
	if (!exists) {
		await minioClient.makeBucket(bucket);
	}
}

/**
 * Upload l'image de fond d'une map dans le bucket campaigns, sous la clé
 * déterministe `campaignId/maps/mapId` (écrase l'éventuelle image précédente).
 * Crée l'enregistrement `File` (domaine `map`) et le retourne.
 */
export async function uploadMapFile(
	mapId: string,
	campaignId: string,
	ownerId: string,
	file: File,
): Promise<{ id: string; mimeType: string; displayName: string }> {
	const buffer = Buffer.from(await file.arrayBuffer());
	await ensureBucket(BUCKET_MAPS);
	const objectName = mapObjectKey(campaignId, mapId);
	await minioClient.putObject(BUCKET_MAPS, objectName, buffer, buffer.length, {
		"Content-Type": file.type,
	});

	const fileId = newId();
	const fileRecord = await prisma.file.create({
		data: {
			id: fileId,
			ownerId,
			campaignId,
			domain: "map",
			displayName: file.name,
			mimeType: file.type,
			sizeBytes: BigInt(file.size),
			isPublic: false,
		},
	});

	return fileRecord;
}

/**
 * Génère une URL présignée pour lire l'image de fond d'une map.
 * Valide 1 heure par défaut.
 */
export async function getPresignedMapUrl(
	campaignId: string,
	mapId: string,
	expirySeconds = 3600,
): Promise<string> {
	return minioClient.presignedGetObject(
		BUCKET_MAPS,
		mapObjectKey(campaignId, mapId),
		expirySeconds,
	);
}
