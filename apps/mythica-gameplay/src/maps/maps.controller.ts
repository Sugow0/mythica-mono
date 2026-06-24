import { Elysia, t } from "elysia";
import { authContext, type CurrentUser } from "../auth/context";
import { ErrorResponse } from "../lib/http";
import { prisma } from "../lib/prisma";
import { uploadMapFile } from "./map-storage";
import {
	createMap,
	deleteMap,
	getMap,
	getMaps,
	setMapFile,
	updateMap,
} from "./maps.service";
import { CreateMapBody, MapDto, UpdateMapBody } from "./maps.types";

// ------------------------------------------------------------
// Helper d'accès MJ sur une campagne
// ------------------------------------------------------------

async function resolveCampaignGm(
	campaignId: string,
	user: CurrentUser | null,
): Promise<
	| { ok: true; campaign: { id: string; ownerId: string } }
	| { ok: false; status: 401 | 403 | 404; error: string }
> {
	if (!user) {
		return { ok: false, status: 401, error: "Non authentifié" };
	}
	const campaign = await prisma.campaign.findFirst({
		where: { id: campaignId, deletedAt: null },
	});
	if (!campaign) {
		return { ok: false, status: 404, error: "Campagne introuvable" };
	}
	const member = await prisma.campaignMember.findFirst({
		where: { campaignId, userId: user.id, leftAt: null },
	});
	const isGm = campaign.ownerId === user.id || member?.role === "gm";
	if (!isGm) {
		return { ok: false, status: 403, error: "Réservé au MJ" };
	}
	return { ok: true, campaign };
}

// ------------------------------------------------------------
// Controller
// Le préfixe utilise `:id` (et non `:campaignId`) pour correspondre au
// paramètre déjà enregistré par campaignsController sous /campaigns/:id.
// Elysia interdit deux noms de paramètre différents sur le même segment.
// ------------------------------------------------------------

export const mapsController = new Elysia({ prefix: "/campaigns/:id/maps" })
	.use(authContext)

	/** GET /campaigns/:id/maps - Lister les maps d'une campagne */
	.get(
		"/",
		async ({ set, currentUser, params }) => {
			const access = await resolveCampaignGm(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			return { success: true as const, maps: await getMaps(params.id) };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true), maps: t.Array(MapDto) }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Maps"], summary: "Lister les maps d'une campagne" },
		},
	)

	/** POST /campaigns/:id/maps - Créer une map */
	.post(
		"/",
		async ({ set, currentUser, params, body }) => {
			const access = await resolveCampaignGm(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const map = await createMap(params.id, body);
			set.status = 201;
			return { success: true as const, map };
		},
		{
			params: t.Object({ id: t.String() }),
			body: CreateMapBody,
			response: {
				201: t.Object({ success: t.Literal(true), map: MapDto }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Maps"], summary: "Créer une map" },
		},
	)

	/** GET /campaigns/:id/maps/:mapId - Détail d'une map */
	.get(
		"/:mapId",
		async ({ set, currentUser, params }) => {
			const access = await resolveCampaignGm(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const map = await getMap(params.mapId, params.id);
			if (!map) {
				set.status = 404;
				return { success: false as const, error: "Map introuvable" };
			}
			return { success: true as const, map };
		},
		{
			params: t.Object({ id: t.String(), mapId: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true), map: MapDto }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Maps"], summary: "Détail d'une map" },
		},
	)

	/** PATCH /campaigns/:id/maps/:mapId - Modifier une map */
	.patch(
		"/:mapId",
		async ({ set, currentUser, params, body }) => {
			const access = await resolveCampaignGm(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const map = await updateMap(params.mapId, params.id, body);
			if (!map) {
				set.status = 404;
				return { success: false as const, error: "Map introuvable" };
			}
			return { success: true as const, map };
		},
		{
			params: t.Object({ id: t.String(), mapId: t.String() }),
			body: UpdateMapBody,
			response: {
				200: t.Object({ success: t.Literal(true), map: MapDto }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Maps"], summary: "Modifier une map" },
		},
	)

	/** DELETE /campaigns/:id/maps/:mapId - Supprimer une map */
	.delete(
		"/:mapId",
		async ({ set, currentUser, params }) => {
			const access = await resolveCampaignGm(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const ok = await deleteMap(params.mapId, params.id);
			if (!ok) {
				set.status = 404;
				return { success: false as const, error: "Map introuvable" };
			}
			return { success: true as const };
		},
		{
			params: t.Object({ id: t.String(), mapId: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true) }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Maps"], summary: "Supprimer une map" },
		},
	)

	/** POST /campaigns/:id/maps/:mapId/file - Uploader l'image de fond d'une map */
	.post(
		"/:mapId/file",
		async ({ set, currentUser, params, body }) => {
			const access = await resolveCampaignGm(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const existing = await getMap(params.mapId, params.id);
			if (!existing) {
				set.status = 404;
				return { success: false as const, error: "Map introuvable" };
			}
			const fileRecord = await uploadMapFile(
				params.mapId,
				params.id,
				(currentUser as CurrentUser).id,
				body.file,
			);
			const map = await setMapFile(params.mapId, fileRecord.id);
			return { success: true as const, map, file: fileRecord };
		},
		{
			params: t.Object({ id: t.String(), mapId: t.String() }),
			body: t.Object({
				file: t.File({
					type: ["image/png", "image/jpeg", "image/webp"],
					maxSize: "20m",
				}),
			}),
			response: {
				200: t.Object({
					success: t.Literal(true),
					map: t.Any(),
					file: t.Any(),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Maps"],
				summary: "Uploader l'image de fond d'une map",
			},
		},
	);
