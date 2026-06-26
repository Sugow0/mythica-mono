import { Elysia, t } from "elysia";
import { getPresignedAvatarUrl } from "../lib/avatar-storage";
import { ErrorResponse } from "../lib/http";
import { prisma } from "../lib/prisma";
import { getPresignedMapUrl } from "../maps/map-storage";

export const filesController = new Elysia({ prefix: "/files" }).get(
	"/:fileId/content",
	async ({ params, set }) => {
		const file = await prisma.file.findUnique({
			where: { id: params.fileId },
		});

		if (!file) {
			set.status = 404;
			return { success: false, error: "Fichier introuvable" };
		}

		let url: string | null = null;

		if (file.domain === "map") {
			if (!file.campaignId) {
				set.status = 404;
				return {
					success: false,
					error: "Campagne introuvable pour ce fichier",
				};
			}
			// Find the map using this file to get the mapId
			const map = await prisma.map.findFirst({
				where: { fileId: file.id },
			});
			if (!map) {
				set.status = 404;
				return { success: false, error: "Map introuvable pour ce fichier" };
			}
			url = await getPresignedMapUrl(file.campaignId, map.id);
		} else if (file.domain === "avatar") {
			// Find the character sheet using this file
			const sheet = await prisma.characterSheet.findFirst({
				where: { avatarFileId: file.id },
			});
			if (!sheet) {
				set.status = 404;
				return { success: false, error: "Fiche introuvable pour ce fichier" };
			}
			url = await getPresignedAvatarUrl(sheet.id);
		}

		if (!url) {
			set.status = 404;
			return { success: false, error: "Domaine de fichier non supporté" };
		}

		// Fetch et proxy du fichier pour éviter les erreurs CORS
		const response = await fetch(url);
		if (!response.ok) {
			set.status = 500;
			return { success: false, error: "Erreur lors du téléchargement" };
		}
		
		set.headers["content-type"] = response.headers.get("content-type") || "application/octet-stream";
		// Pour la mise en cache
		set.headers["cache-control"] = "public, max-age=31536000";
		
		return response.blob();
	},
	{
		params: t.Object({ fileId: t.String() }),
		response: {
			404: ErrorResponse,
		},
		detail: {
			tags: ["Files"],
			summary: "Obtenir le contenu d'un fichier (redirection)",
		},
	},
);
