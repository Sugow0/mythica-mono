import * as Minio from "minio";

// Stockage objet S3-compatible (RustFS) pour les images de couverture de
// campagne. On lit en priorité les variables RUSTFS_*, avec repli sur MINIO_*
// pour rétrocompatibilité — même convention que l'API plateforme.
const endpoint =
	process.env.RUSTFS_ENDPOINT ??
	process.env.MINIO_ENDPOINT ??
	"http://localhost:24000";
const url = new URL(endpoint);
const useSSL = url.protocol === "https:";
const port = url.port ? Number.parseInt(url.port, 10) : useSSL ? 443 : 80;

export const minioClient = new Minio.Client({
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

export const BUCKET_CAMPAIGNS =
	process.env.RUSTFS_BUCKET_CAMPAIGNS ??
	process.env.MINIO_BUCKET_CAMPAIGNS ??
	"campaigns";

/** Clé objet déterministe pour la couverture d'une campagne : `campaignId/cover`. */
export function coverObjectKey(campaignId: string): string {
	return `${campaignId}/cover`;
}

/** Vérifie que le bucket existe et le crée si besoin. */
async function ensureBucket(bucket: string): Promise<void> {
	const exists = await minioClient.bucketExists(bucket);
	if (!exists) {
		await minioClient.makeBucket(bucket);
	}
}

/**
 * Upload la couverture d'une campagne dans le bucket campaigns, sous la clé
 * déterministe `campaignId/cover` (écrase l'éventuelle couverture précédente).
 * Retourne la clé objet.
 */
export async function uploadCampaignCover(
	campaignId: string,
	data: Buffer,
	contentType: string,
): Promise<string> {
	await ensureBucket(BUCKET_CAMPAIGNS);
	const objectName = coverObjectKey(campaignId);
	await minioClient.putObject(BUCKET_CAMPAIGNS, objectName, data, data.length, {
		"Content-Type": contentType,
	});
	return objectName;
}

/**
 * Génère une URL présignée pour lire la couverture d'une campagne (affichage
 * dans le front). Valide 1 heure par défaut.
 */
export async function getPresignedCoverUrl(
	campaignId: string,
	expirySeconds = 3600,
): Promise<string> {
	return minioClient.presignedGetObject(
		BUCKET_CAMPAIGNS,
		coverObjectKey(campaignId),
		expirySeconds,
	);
}
