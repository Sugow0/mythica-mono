import {
	getPresignedCoverUrl,
	uploadCampaignCover,
} from "../../../lib/cover-storage";
import { newId } from "../../../lib/id";
import { prisma } from "../../../lib/prisma";

const ALLOWED_COVER_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

/** Taille maximale d'une image de couverture : 10 Mo. */
export const MAX_COVER_SIZE_BYTES = 10 * 1024 * 1024;

/** Vrai si le type MIME est une image de couverture autorisée. */
export function isAllowedCoverType(mime: string): boolean {
	return ALLOWED_COVER_MIME_TYPES.includes(
		mime as (typeof ALLOWED_COVER_MIME_TYPES)[number],
	);
}

export type UploadCoverInput = {
	campaignId: string;
	userId: string;
	data: Buffer;
	contentType: string;
};

export type UploadCoverResult =
	| { ok: true; fileId: string; coverUrl: string | null }
	| { ok: false; status: 400 | 403 | 404; error: string };

/**
 * Upload l'image de couverture d'une campagne.
 *
 * Réservé au propriétaire. Valide le type MIME et la taille, stocke le fichier
 * dans le stockage objet, crée l'enregistrement `File` (domaine `cover`) et met
 * à jour `coverFileId` de la campagne. Retourne l'identifiant du fichier et une
 * URL présignée pour affichage immédiat.
 */
export async function uploadCoverHandler(
	input: UploadCoverInput,
): Promise<UploadCoverResult> {
	const { campaignId, userId, data, contentType } = input;

	const campaign = await prisma.campaign.findFirst({
		where: { id: campaignId, deletedAt: null },
	});
	if (!campaign) {
		return { ok: false, status: 404, error: "Campagne introuvable" };
	}
	if (campaign.ownerId !== userId) {
		return { ok: false, status: 403, error: "Accès refusé" };
	}
	if (!isAllowedCoverType(contentType)) {
		return {
			ok: false,
			status: 400,
			error: "Type de fichier non autorisé. Utilisez JPEG, PNG ou WebP.",
		};
	}
	if (data.length > MAX_COVER_SIZE_BYTES) {
		return {
			ok: false,
			status: 400,
			error: `Fichier trop volumineux (max. ${MAX_COVER_SIZE_BYTES / 1024 / 1024} Mo).`,
		};
	}

	await uploadCampaignCover(campaignId, data, contentType);

	const fileId = newId();
	await prisma.$transaction([
		prisma.file.create({
			data: {
				id: fileId,
				ownerId: userId,
				campaignId,
				domain: "cover",
				displayName: "cover",
				mimeType: contentType,
				sizeBytes: BigInt(data.length),
				isPublic: campaign.isPublic,
			},
		}),
		prisma.campaign.update({
			where: { id: campaignId },
			data: { coverFileId: fileId },
		}),
	]);

	const coverUrl = await getPresignedCoverUrl(campaignId).catch(() => null);
	return { ok: true, fileId, coverUrl };
}
