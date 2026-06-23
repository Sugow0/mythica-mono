import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { duplicateCharacterSheet } from "../character-sheets/character-sheets.service";
import { ErrorResponse, SuccessMessageResponse } from "../lib/http";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function findActiveCampaign(id: string) {
	return prisma.campaign.findFirst({ where: { id, deletedAt: null } });
}

async function memberRole(
	campaignId: string,
	userId: string,
): Promise<string | null> {
	const member = await prisma.campaignMember.findFirst({
		where: { campaignId, userId, leftAt: null },
	});
	return member?.role ?? null;
}

function isGmOf(
	campaign: { ownerId: string },
	userId: string,
	role: string | null,
): boolean {
	return campaign.ownerId === userId || role === "gm";
}

// ------------------------------------------------------------
// Schémas TypeBox
// ------------------------------------------------------------

const CampaignSheetStatus = t.Union([
	t.Literal("active"),
	t.Literal("inactive"),
	t.Literal("disabled"),
]);

const PoolRequestStatus = t.Union([
	t.Literal("pending"),
	t.Literal("confirmed"),
	t.Literal("rejected"),
]);

const ChangeRequestStatus = t.Union([
	t.Literal("pending"),
	t.Literal("approved"),
	t.Literal("rejected"),
]);

const PoolSheetSchema = t.Object({
	id: t.String({ format: "uuid" }),
	characterSheetId: t.String({ format: "uuid" }),
	name: t.String(),
	visibleToPlayers: t.Boolean(),
	pendingRequestCount: t.Integer(),
});

const PoolRequestSchema = t.Object({
	id: t.String({ format: "uuid" }),
	poolSheetId: t.String({ format: "uuid" }),
	requestedByUserId: t.String({ format: "uuid" }),
	status: PoolRequestStatus,
	assignedSheetId: t.Union([t.String({ format: "uuid" }), t.Null()]),
	poolSheetName: t.String(),
	createdAt: t.Date(),
});

const ChangeRequestSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	playerId: t.String({ format: "uuid" }),
	targetSheetId: t.String({ format: "uuid" }),
	targetSheetName: t.String(),
	status: ChangeRequestStatus,
	createdAt: t.Date(),
});

// ------------------------------------------------------------
// Contrôleur
// ------------------------------------------------------------

export const campaignCharacterSheetsController = new Elysia({
	prefix: "/campaigns",
})
	.use(authContext)

	// ==================== FLUX JOUEUR ====================

	/** POST /campaigns/:id/character-sheets/import — Importer un master comme snapshot */
	.post(
		"/:id/character-sheets/import",
		async ({ set, currentUser, body, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			if (campaign.characterCreationLocked) {
				set.status = 403;
				return {
					success: false as const,
					error: "Création/import de fiche désactivé par le MJ",
				};
			}

			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role) && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const source = await prisma.characterSheet.findFirst({
				where: {
					id: body.sourceSheetId,
					userId: currentUser.id,
					deletedAt: null,
				},
			});
			if (!source) {
				set.status = 404;
				return { success: false as const, error: "Fiche source introuvable" };
			}

			if (source.gameSystemId !== campaign.gameSystemId) {
				const [sourceGs, campaignGs] = await Promise.all([
					prisma.gameSystem.findUnique({
						where: { id: source.gameSystemId },
						select: { parentSystemId: true },
					}),
					prisma.gameSystem.findUnique({
						where: { id: campaign.gameSystemId },
						select: { parentSystemId: true },
					}),
				]);
				const compatible =
					sourceGs?.parentSystemId === campaign.gameSystemId ||
					campaignGs?.parentSystemId === source.gameSystemId;
				if (!compatible) {
					set.status = 409;
					return {
						success: false as const,
						error: "Système de jeu incompatible",
					};
				}
			}

			const snapshotId = await duplicateCharacterSheet(
				body.sourceSheetId,
				currentUser.id,
				prisma,
			);
			const link = await prisma.campaignCharacterSheet.create({
				data: {
					id: newId(),
					campaignId: params.id,
					characterSheetId: snapshotId,
					status: "inactive",
				},
			});
			set.status = 201;
			return {
				success: true as const,
				id: link.id,
				characterSheetId: snapshotId,
			};
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ sourceSheetId: t.String({ format: "uuid" }) }),
			response: {
				201: t.Object({
					success: t.Literal(true),
					id: t.String(),
					characterSheetId: t.String(),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Importer un master comme snapshot",
			},
		},
	)

	/** POST /campaigns/:id/character-sheets/create — Lier un master nouvellement créé */
	.post(
		"/:id/character-sheets/create",
		async ({ set, currentUser, body, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			if (campaign.characterCreationLocked) {
				set.status = 403;
				return {
					success: false as const,
					error: "Création/import de fiche désactivé par le MJ",
				};
			}

			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role) && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const master = await prisma.characterSheet.findFirst({
				where: {
					id: body.characterSheetId,
					userId: currentUser.id,
					deletedAt: null,
				},
			});
			if (!master) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}

			const snapshotId = await duplicateCharacterSheet(
				body.characterSheetId,
				currentUser.id,
				prisma,
			);
			const link = await prisma.campaignCharacterSheet.create({
				data: {
					id: newId(),
					campaignId: params.id,
					characterSheetId: snapshotId,
					status: "inactive",
				},
			});
			set.status = 201;
			return {
				success: true as const,
				id: link.id,
				characterSheetId: snapshotId,
			};
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ characterSheetId: t.String({ format: "uuid" }) }),
			response: {
				201: t.Object({
					success: t.Literal(true),
					id: t.String(),
					characterSheetId: t.String(),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Créer un snapshot depuis un master",
			},
		},
	)

	/** POST /campaigns/:id/character-sheets/:campaignSheetId/activate — Activer une fiche inactive */
	.post(
		"/:id/character-sheets/:campaignSheetId/activate",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			if (campaign.characterCreationLocked) {
				set.status = 403;
				return { success: false as const, error: "Action réservée au MJ" };
			}

			const link = await prisma.campaignCharacterSheet.findFirst({
				where: {
					id: params.campaignSheetId,
					campaignId: params.id,
					characterSheet: { userId: currentUser.id },
				},
				include: { characterSheet: { select: { userId: true } } },
			});
			if (!link) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}
			if (link.status !== "inactive") {
				set.status = 409;
				return {
					success: false as const,
					error: "La fiche n'est pas dans un état activable",
				};
			}

			// Vérifie qu'il n'y a pas déjà une fiche active pour ce joueur.
			const alreadyActive = await prisma.campaignCharacterSheet.findFirst({
				where: {
					campaignId: params.id,
					status: "active",
					characterSheet: { userId: currentUser.id },
				},
			});
			if (alreadyActive) {
				set.status = 409;
				return {
					success: false as const,
					error:
						"Vous avez déjà une fiche active. Faites une demande de changement.",
				};
			}

			await prisma.campaignCharacterSheet.update({
				where: { id: link.id },
				data: { status: "active" },
			});
			return { success: true as const, message: "Fiche activée" };
		},
		{
			params: t.Object({ id: t.String(), campaignSheetId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Activer une fiche inactive" },
		},
	)

	/** POST /campaigns/:id/character-sheets/change-request — Demande de changement de personnage */
	.post(
		"/:id/character-sheets/change-request",
		async ({ set, currentUser, body, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}

			const role = await memberRole(params.id, currentUser.id);
			if (!role && campaign.ownerId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			// Le joueur doit avoir une fiche active pour faire une demande de changement.
			const activeSheet = await prisma.campaignCharacterSheet.findFirst({
				where: {
					campaignId: params.id,
					status: "active",
					characterSheet: { userId: currentUser.id },
				},
			});
			if (!activeSheet) {
				set.status = 409;
				return {
					success: false as const,
					error:
						"Vous n'avez pas de fiche active. Activez directement une fiche inactive.",
				};
			}

			// La fiche cible doit exister, appartenir au joueur, et être inactive.
			const target = await prisma.campaignCharacterSheet.findFirst({
				where: {
					id: body.targetCampaignSheetId,
					campaignId: params.id,
					characterSheet: { userId: currentUser.id },
					status: "inactive",
				},
			});
			if (!target) {
				set.status = 404;
				return {
					success: false as const,
					error: "Fiche cible introuvable ou non éligible",
				};
			}

			const request = await prisma.campaignCharacterChangeRequest.create({
				data: {
					id: newId(),
					campaignId: params.id,
					playerId: currentUser.id,
					targetSheetId: target.id,
					status: "pending",
				},
			});
			set.status = 201;
			return { success: true as const, id: request.id };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ targetCampaignSheetId: t.String({ format: "uuid" }) }),
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Demande de changement de personnage",
			},
		},
	)

	/** GET /campaigns/:id/character-sheets/change-requests — Liste des demandes (MJ) */
	.get(
		"/:id/character-sheets/change-requests",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const requests = await prisma.campaignCharacterChangeRequest.findMany({
				where: { campaignId: params.id, status: "pending" },
				include: {
					targetSheet: {
						include: { characterSheet: { select: { name: true } } },
					},
				},
				orderBy: { createdAt: "asc" },
			});

			return {
				success: true as const,
				requests: requests.map((r) => ({
					id: r.id,
					campaignId: r.campaignId,
					playerId: r.playerId,
					targetSheetId: r.targetSheetId,
					targetSheetName: r.targetSheet.characterSheet.name,
					status: r.status,
					createdAt: r.createdAt,
				})),
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					requests: t.Array(ChangeRequestSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Demandes de changement en attente",
			},
		},
	)

	/** POST /campaigns/:id/character-sheets/change-requests/:requestId/approve */
	.post(
		"/:id/character-sheets/change-requests/:requestId/approve",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const request = await prisma.campaignCharacterChangeRequest.findFirst({
				where: {
					id: params.requestId,
					campaignId: params.id,
					status: "pending",
				},
			});
			if (!request) {
				set.status = 404;
				return { success: false as const, error: "Demande introuvable" };
			}

			await prisma.$transaction([
				// Désactiver la fiche actuellement active du joueur.
				prisma.campaignCharacterSheet.updateMany({
					where: {
						campaignId: params.id,
						status: "active",
						characterSheet: { userId: request.playerId },
					},
					data: { status: "disabled" },
				}),
				// Activer la fiche cible.
				prisma.campaignCharacterSheet.update({
					where: { id: request.targetSheetId },
					data: { status: "active" },
				}),
				// Clôturer la demande.
				prisma.campaignCharacterChangeRequest.update({
					where: { id: request.id },
					data: { status: "approved" },
				}),
			]);

			return { success: true as const, message: "Demande approuvée" };
		},
		{
			params: t.Object({ id: t.String(), requestId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Approuver une demande de changement",
			},
		},
	)

	/** POST /campaigns/:id/character-sheets/change-requests/:requestId/reject */
	.post(
		"/:id/character-sheets/change-requests/:requestId/reject",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const updated = await prisma.campaignCharacterChangeRequest.updateMany({
				where: {
					id: params.requestId,
					campaignId: params.id,
					status: "pending",
				},
				data: { status: "rejected" },
			});
			if (updated.count === 0) {
				set.status = 404;
				return { success: false as const, error: "Demande introuvable" };
			}
			return { success: true as const, message: "Demande rejetée" };
		},
		{
			params: t.Object({ id: t.String(), requestId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Rejeter une demande de changement",
			},
		},
	)

	// ==================== FLUX MJ — CYCLE DE VIE ====================

	/** PATCH /campaigns/:id/character-sheets/:campaignSheetId/disable — Désactiver une fiche (mort) */
	.patch(
		"/:id/character-sheets/:campaignSheetId/disable",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const link = await prisma.campaignCharacterSheet.findFirst({
				where: { id: params.campaignSheetId, campaignId: params.id },
			});
			if (!link) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}
			if (link.status === "disabled") {
				set.status = 409;
				return { success: false as const, error: "Fiche déjà désactivée" };
			}

			await prisma.campaignCharacterSheet.update({
				where: { id: link.id },
				data: { status: "disabled" },
			});
			return { success: true as const, message: "Fiche désactivée" };
		},
		{
			params: t.Object({ id: t.String(), campaignSheetId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Désactiver une fiche (mort du personnage)",
			},
		},
	)

	/** PATCH /campaigns/:id/character-sheets/:campaignSheetId/reactivate — Réactiver une fiche disabled */
	.patch(
		"/:id/character-sheets/:campaignSheetId/reactivate",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const updated = await prisma.campaignCharacterSheet.updateMany({
				where: {
					id: params.campaignSheetId,
					campaignId: params.id,
					status: "disabled",
				},
				data: { status: "inactive" },
			});
			if (updated.count === 0) {
				set.status = 404;
				return {
					success: false as const,
					error: "Fiche introuvable ou non désactivée",
				};
			}
			return { success: true as const, message: "Fiche réactivée" };
		},
		{
			params: t.Object({ id: t.String(), campaignSheetId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Réactiver une fiche désactivée",
			},
		},
	)

	/** PATCH /campaigns/:id/settings — Paramètres de la campagne (MJ) */
	.patch(
		"/:id/settings",
		async ({ set, currentUser, body, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			await prisma.campaign.update({
				where: { id: params.id },
				data: { characterCreationLocked: body.characterCreationLocked },
			});
			return { success: true as const, message: "Paramètres mis à jour" };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ characterCreationLocked: t.Boolean() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Paramètres de la campagne" },
		},
	)

	// ==================== POOL MJ ====================

	/** POST /campaigns/:id/pool/import — Importer un master dans le pool MJ */
	.post(
		"/:id/pool/import",
		async ({ set, currentUser, body, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const source = await prisma.characterSheet.findFirst({
				where: {
					id: body.sourceSheetId,
					userId: currentUser.id,
					deletedAt: null,
				},
			});
			if (!source) {
				set.status = 404;
				return { success: false as const, error: "Fiche source introuvable" };
			}

			const snapshotId = await duplicateCharacterSheet(
				body.sourceSheetId,
				currentUser.id,
				prisma,
			);
			const poolSheet = await prisma.campaignPoolSheet.create({
				data: {
					id: newId(),
					campaignId: params.id,
					characterSheetId: snapshotId,
					visibleToPlayers: false,
				},
			});
			set.status = 201;
			return { success: true as const, id: poolSheet.id };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ sourceSheetId: t.String({ format: "uuid" }) }),
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Importer un master dans le pool MJ",
			},
		},
	)

	/** GET /campaigns/:id/pool — Liste des fiches du pool */
	.get(
		"/:id/pool",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role) && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const gm = isGmOf(campaign, currentUser.id, role);
			const poolSheets = await prisma.campaignPoolSheet.findMany({
				where: {
					campaignId: params.id,
					...(gm ? {} : { visibleToPlayers: true }),
				},
				include: {
					characterSheet: { select: { name: true } },
					requests: gm ? { where: { status: "pending" } } : false,
				},
				orderBy: { createdAt: "asc" },
			});

			return {
				success: true as const,
				sheets: poolSheets.map((ps) => ({
					id: ps.id,
					characterSheetId: ps.characterSheetId,
					name: ps.characterSheet.name,
					visibleToPlayers: ps.visibleToPlayers,
					pendingRequestCount: ps.requests?.length ?? 0,
				})),
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					sheets: t.Array(PoolSheetSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Fiches du pool MJ" },
		},
	)

	/** PATCH /campaigns/:id/pool/:poolSheetId/visibility — Toggle visibilité */
	.patch(
		"/:id/pool/:poolSheetId/visibility",
		async ({ set, currentUser, body, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const updated = await prisma.campaignPoolSheet.updateMany({
				where: { id: params.poolSheetId, campaignId: params.id },
				data: { visibleToPlayers: body.visibleToPlayers },
			});
			if (updated.count === 0) {
				set.status = 404;
				return { success: false as const, error: "Fiche du pool introuvable" };
			}
			return { success: true as const, message: "Visibilité mise à jour" };
		},
		{
			params: t.Object({ id: t.String(), poolSheetId: t.String() }),
			body: t.Object({ visibleToPlayers: t.Boolean() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Modifier la visibilité d'une fiche du pool",
			},
		},
	)

	/** DELETE /campaigns/:id/pool/:poolSheetId — Retirer une fiche du pool */
	.delete(
		"/:id/pool/:poolSheetId",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const poolSheet = await prisma.campaignPoolSheet.findFirst({
				where: { id: params.poolSheetId, campaignId: params.id },
			});
			if (!poolSheet) {
				set.status = 404;
				return { success: false as const, error: "Fiche du pool introuvable" };
			}

			await prisma.$transaction([
				prisma.campaignPoolSheet.delete({ where: { id: poolSheet.id } }),
				prisma.characterSheet.update({
					where: { id: poolSheet.characterSheetId },
					data: { deletedAt: new Date() },
				}),
			]);
			return { success: true as const, message: "Fiche retirée du pool" };
		},
		{
			params: t.Object({ id: t.String(), poolSheetId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Retirer une fiche du pool" },
		},
	)

	// ==================== FLUX ATTRIBUTION (POOL) ====================

	/** POST /campaigns/:id/pool/:poolSheetId/request — Joueur demande une fiche du pool */
	.post(
		"/:id/pool/:poolSheetId/request",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!role && campaign.ownerId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const poolSheet = await prisma.campaignPoolSheet.findFirst({
				where: {
					id: params.poolSheetId,
					campaignId: params.id,
					visibleToPlayers: true,
				},
			});
			if (!poolSheet) {
				set.status = 404;
				return {
					success: false as const,
					error: "Fiche du pool introuvable ou non visible",
				};
			}

			try {
				const request = await prisma.campaignPoolRequest.create({
					data: {
						id: newId(),
						poolSheetId: params.poolSheetId,
						requestedByUserId: currentUser.id,
						status: "pending",
					},
				});
				set.status = 201;
				return { success: true as const, id: request.id };
			} catch (err) {
				if ((err as { code?: string }).code === "P2002") {
					set.status = 409;
					return { success: false as const, error: "Demande déjà existante" };
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String(), poolSheetId: t.String() }),
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Demander une fiche du pool" },
		},
	)

	/** GET /campaigns/:id/pool/requests — MJ voit les demandes en attente */
	.get(
		"/:id/pool/requests",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const requests = await prisma.campaignPoolRequest.findMany({
				where: {
					poolSheet: { campaignId: params.id },
					status: "pending",
				},
				include: {
					poolSheet: {
						include: { characterSheet: { select: { name: true } } },
					},
				},
				orderBy: { createdAt: "asc" },
			});

			return {
				success: true as const,
				requests: requests.map((r) => ({
					id: r.id,
					poolSheetId: r.poolSheetId,
					requestedByUserId: r.requestedByUserId,
					status: r.status,
					assignedSheetId: r.assignedSheetId,
					poolSheetName: r.poolSheet.characterSheet.name,
					createdAt: r.createdAt,
				})),
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					requests: t.Array(PoolRequestSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Demandes de fiche du pool" },
		},
	)

	/** POST /campaigns/:id/pool/:poolSheetId/requests/:requestId/confirm — MJ confirme */
	.post(
		"/:id/pool/:poolSheetId/requests/:requestId/confirm",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const request = await prisma.campaignPoolRequest.findFirst({
				where: {
					id: params.requestId,
					poolSheetId: params.poolSheetId,
					status: "pending",
				},
				include: { poolSheet: true },
			});
			if (!request) {
				set.status = 404;
				return { success: false as const, error: "Demande introuvable" };
			}

			// Créer un snapshot de la fiche du pool pour le joueur.
			const snapshotId = await duplicateCharacterSheet(
				request.poolSheet.characterSheetId,
				request.requestedByUserId,
				prisma,
			);

			// Statut de la fiche selon le mode de la campagne.
			const sheetStatus = campaign.characterCreationLocked
				? "active"
				: "inactive";

			const ops = [
				prisma.campaignCharacterSheet.create({
					data: {
						id: newId(),
						campaignId: params.id,
						characterSheetId: snapshotId,
						status: sheetStatus,
					},
				}),
				prisma.campaignPoolRequest.update({
					where: { id: request.id },
					data: { status: "confirmed", assignedSheetId: snapshotId },
				}),
			] as const;

			// Si la campagne est verrouillée et la fiche devient active,
			// désactiver l'éventuelle fiche active du joueur.
			if (campaign.characterCreationLocked) {
				await prisma.$transaction([
					prisma.campaignCharacterSheet.updateMany({
						where: {
							campaignId: params.id,
							status: "active",
							characterSheet: { userId: request.requestedByUserId },
						},
						data: { status: "disabled" },
					}),
					...ops,
				]);
			} else {
				await prisma.$transaction([...ops]);
			}

			return { success: true as const, message: "Attribution confirmée" };
		},
		{
			params: t.Object({
				id: t.String(),
				poolSheetId: t.String(),
				requestId: t.String(),
			}),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Confirmer une attribution de fiche",
			},
		},
	)

	/** POST /campaigns/:id/pool/:poolSheetId/requests/:requestId/reject — MJ rejette */
	.post(
		"/:id/pool/:poolSheetId/requests/:requestId/reject",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			const role = await memberRole(params.id, currentUser.id);
			if (!isGmOf(campaign, currentUser.id, role)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const updated = await prisma.campaignPoolRequest.updateMany({
				where: {
					id: params.requestId,
					poolSheetId: params.poolSheetId,
					status: "pending",
				},
				data: { status: "rejected" },
			});
			if (updated.count === 0) {
				set.status = 404;
				return { success: false as const, error: "Demande introuvable" };
			}
			return { success: true as const, message: "Demande rejetée" };
		},
		{
			params: t.Object({
				id: t.String(),
				poolSheetId: t.String(),
				requestId: t.String(),
			}),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Rejeter une demande de fiche" },
		},
	);
