import { BUCKET_CAMPAIGNS, minioClient } from "../lib/cover-storage";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";

// Stockage objet S3-compatible (RustFS) pour les images de maps.
// Réutilise le client Minio et le bucket exportés depuis cover-storage.ts
const BUCKET_MAPS = BUCKET_CAMPAIGNS;

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
