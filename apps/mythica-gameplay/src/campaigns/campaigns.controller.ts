import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { getPresignedCoverUrl } from "../lib/cover-storage";
import { ErrorResponse, SuccessMessageResponse } from "../lib/http";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import {
	chatChannel,
	MAX_MESSAGE_LENGTH,
	postMessageHandler,
} from "./commands/post-message/post-message.handler";
import { uploadCoverHandler } from "./commands/upload-cover/upload-cover.handler";

// ------------------------------------------------------------
// Schémas
// ------------------------------------------------------------

const MemberRole = t.Union([
	t.Literal("gm"),
	t.Literal("player"),
	t.Literal("spectator"),
]);

const CampaignStatus = t.Union([
	t.Literal("active"),
	t.Literal("paused"),
	t.Literal("archived"),
]);

const SessionStatus = t.Union([
	t.Literal("scheduled"),
	t.Literal("active"),
	t.Literal("paused"),
	t.Literal("ended"),
]);

const CampaignSchema = t.Object({
	id: t.String({ format: "uuid" }),
	ownerId: t.String({ format: "uuid" }),
	gameSystemId: t.String({ format: "uuid" }),
	nom: t.String(),
	description: t.Union([t.String(), t.Null()]),
	isPublic: t.Boolean(),
	status: CampaignStatus,
	tags: t.Array(t.String()),
	coverFileId: t.Union([t.String(), t.Null()]),
	coverUrl: t.Union([t.String(), t.Null()]),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

/** Campagne enrichie pour le dashboard (système, membres, dernière session). */
const CampaignDashboardSchema = t.Composite([
	CampaignSchema,
	t.Object({
		gameSystemName: t.String(),
		memberCount: t.Integer(),
		myRole: MemberRole,
		lastSessionAt: t.Union([t.Date(), t.Null()]),
	}),
]);

const MemberSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	userId: t.String({ format: "uuid" }),
	role: MemberRole,
	joinedAt: t.Date(),
	leftAt: t.Union([t.Date(), t.Null()]),
	user: t.Object({ pseudo: t.Union([t.String(), t.Null()]) }),
});

const JoinRequestStatus = t.Union([
	t.Literal("pending"),
	t.Literal("accepted"),
	t.Literal("declined"),
]);

const JoinRequestSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	userId: t.String({ format: "uuid" }),
	status: JoinRequestStatus,
	createdAt: t.Date(),
	user: t.Object({ pseudo: t.Union([t.String(), t.Null()]) }),
});

const SessionSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	nom: t.String(),
	status: SessionStatus,
	scheduledAt: t.Union([t.Date(), t.Null()]),
	startedAt: t.Union([t.Date(), t.Null()]),
	endedAt: t.Union([t.Date(), t.Null()]),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

const MessageSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	userId: t.String({ format: "uuid" }),
	content: t.String(),
	createdAt: t.Date(),
	user: t.Object({ pseudo: t.Union([t.String(), t.Null()]) }),
});

const TagsBody = t.Optional(
	t.Array(t.String({ minLength: 1, maxLength: 30 }), { maxItems: 10 }),
);

const CreateCampaignBody = t.Object({
	nom: t.String({ minLength: 1, maxLength: 255 }),
	gameSystemId: t.String({ format: "uuid" }),
	description: t.Optional(t.String()),
	isPublic: t.Optional(t.Boolean()),
	tags: TagsBody,
});

const UpdateCampaignBody = t.Object({
	nom: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	description: t.Optional(t.String()),
	isPublic: t.Optional(t.Boolean()),
	status: t.Optional(CampaignStatus),
	tags: TagsBody,
});

/** Normalise une liste de tags : trim, minuscules, non vides, uniques. */
function normalizeTags(tags: string[]): string[] {
	const seen = new Set<string>();
	for (const raw of tags) {
		const tag = raw.trim().toLowerCase();
		if (tag) seen.add(tag);
	}
	return [...seen];
}

const ListQuery = t.Object({
	page: t.Optional(t.Numeric({ minimum: 1 })),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	search: t.Optional(t.String()),
});

const CreateSessionBody = t.Object({
	nom: t.String({ minLength: 1, maxLength: 255 }),
	scheduledAt: t.Optional(t.String({ format: "date-time" })),
});

const UpdateSessionBody = t.Object({
	nom: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	status: t.Optional(SessionStatus),
	scheduledAt: t.Optional(t.String({ format: "date-time" })),
});

// ------------------------------------------------------------
// Helpers d'autorisation
// ------------------------------------------------------------

/** Charge une campagne non supprimée, ou null. */
function findActiveCampaign(id: string) {
	return prisma.campaign.findFirst({ where: { id, deletedAt: null } });
}

/** Rôle de l'utilisateur dans la campagne (null si non membre actif). */
async function memberRole(
	campaignId: string,
	userId: string,
): Promise<string | null> {
	const member = await prisma.campaignMember.findFirst({
		where: { campaignId, userId, leftAt: null },
	});
	return member?.role ?? null;
}

/**
 * URL présignée de la couverture d'une campagne, ou null si aucune couverture.
 * Tolère une panne du stockage objet (retourne null) pour ne pas casser la
 * sérialisation d'une liste de campagnes.
 */
async function coverUrlFor(c: {
	id: string;
	coverFileId: string | null;
}): Promise<string | null> {
	if (!c.coverFileId) return null;
	return getPresignedCoverUrl(c.id).catch(() => null);
}

/** Code d'erreur Prisma pour violation de contrainte d'unicité. */
const PRISMA_UNIQUE_VIOLATION = "P2002";

/** Schéma d'une fiche liée à une campagne (vue allégée). */
const CampaignCharacterSheetSchema = t.Object({
	id: t.String({ format: "uuid" }),
	characterSheetId: t.String({ format: "uuid" }),
	userId: t.String({ format: "uuid" }),
	name: t.String(),
});

/** Durée de validité d'un lien d'invitation. */
const INVITE_EXPIRY_DAYS = 7;

/** Génère un token d'invitation aléatoire (64 caractères hexadécimaux). */
function generateInviteToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------
// Controller
// ------------------------------------------------------------

export const campaignsController = new Elysia({ prefix: "/campaigns" })
	.use(authContext)

	// ==================== CAMPAGNES ====================

	/** GET /campaigns - Liste des campagnes publiques */
	.get(
		"/",
		async ({ query }) => {
			const page = query.page ?? 1;
			const limit = query.limit ?? 20;
			const where = {
				deletedAt: null,
				isPublic: true,
				...(query.search
					? { nom: { contains: query.search, mode: "insensitive" as const } }
					: {}),
			};

			const [rows, total] = await Promise.all([
				prisma.campaign.findMany({
					where,
					skip: (page - 1) * limit,
					take: limit,
					orderBy: { createdAt: "desc" },
				}),
				prisma.campaign.count({ where }),
			]);

			const items = await Promise.all(
				rows.map(async (c) => ({ ...c, coverUrl: await coverUrlFor(c) })),
			);

			return { success: true as const, items, total, page, limit };
		},
		{
			query: ListQuery,
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(CampaignSchema),
					total: t.Integer(),
					page: t.Integer(),
					limit: t.Integer(),
				}),
			},
			detail: { tags: ["Campaigns"], summary: "Liste des campagnes publiques" },
		},
	)

	/** GET /campaigns/mine - Campagnes dont l'utilisateur est membre/propriétaire */
	.get(
		"/mine",
		async ({ set, currentUser }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const campaigns = await prisma.campaign.findMany({
				where: {
					deletedAt: null,
					OR: [
						{ ownerId: currentUser.id },
						{ members: { some: { userId: currentUser.id, leftAt: null } } },
					],
				},
				orderBy: { updatedAt: "desc" },
				include: {
					gameSystem: { select: { nom: true } },
					members: {
						where: { leftAt: null },
						select: { userId: true, role: true },
					},
					sessions: {
						orderBy: { createdAt: "desc" },
						take: 1,
						select: { scheduledAt: true, createdAt: true },
					},
				},
			});

			const items = await Promise.all(
				campaigns.map(async (c) => {
					const lastSession = c.sessions[0];
					const myRole =
						c.ownerId === currentUser.id
							? "gm"
							: (c.members.find((m) => m.userId === currentUser.id)?.role ??
								"player");
					return {
						id: c.id,
						ownerId: c.ownerId,
						gameSystemId: c.gameSystemId,
						nom: c.nom,
						description: c.description,
						isPublic: c.isPublic,
						status: c.status,
						tags: c.tags,
						coverFileId: c.coverFileId,
						coverUrl: await coverUrlFor(c),
						createdAt: c.createdAt,
						updatedAt: c.updatedAt,
						gameSystemName: c.gameSystem.nom,
						memberCount: c.members.length,
						myRole,
						lastSessionAt:
							lastSession?.scheduledAt ?? lastSession?.createdAt ?? null,
					};
				}),
			);

			return { success: true as const, items };
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(CampaignDashboardSchema),
				}),
				401: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Mes campagnes" },
		},
	)

	/** GET /campaigns/:id - Détails d'une campagne (publique ou membre) */
	.get(
		"/:id",
		async ({ set, params, currentUser }) => {
			const campaign = await prisma.campaign.findFirst({
				where: { id: params.id, deletedAt: null },
				include: {
					members: {
						where: { leftAt: null },
						include: { user: { select: { pseudo: true } } },
					},
				},
			});
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}

			const isMember = currentUser
				? campaign.ownerId === currentUser.id ||
					campaign.members.some((m) => m.userId === currentUser.id)
				: false;
			if (!campaign.isPublic && !isMember) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			// Statut de la demande d'accès du visiteur (pour afficher le bon bouton).
			let myJoinRequestStatus: string | null = null;
			if (currentUser && !isMember) {
				const req = await prisma.campaignJoinRequest.findUnique({
					where: {
						campaignId_userId: {
							campaignId: params.id,
							userId: currentUser.id,
						},
					},
					select: { status: true },
				});
				myJoinRequestStatus = req?.status ?? null;
			}

			const { members, ...rest } = campaign;
			return {
				success: true as const,
				campaign: { ...rest, coverUrl: await coverUrlFor(rest) },
				members,
				myJoinRequestStatus,
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					campaign: CampaignSchema,
					members: t.Array(MemberSchema),
					myJoinRequestStatus: t.Union([JoinRequestStatus, t.Null()]),
				}),
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Détails d'une campagne" },
		},
	)

	/** POST /campaigns - Créer une campagne (l'auteur devient MJ) */
	.post(
		"/",
		async ({ set, currentUser, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const gameSystem = await prisma.gameSystem.findUnique({
				where: { id: body.gameSystemId },
			});
			if (!gameSystem) {
				set.status = 400;
				return { success: false as const, error: "Système de jeu introuvable" };
			}

			const campaignId = newId();
			await prisma.$transaction([
				prisma.campaign.create({
					data: {
						id: campaignId,
						ownerId: currentUser.id,
						gameSystemId: body.gameSystemId,
						nom: body.nom,
						description: body.description ?? null,
						isPublic: body.isPublic ?? false,
						tags: body.tags ? normalizeTags(body.tags) : [],
					},
				}),
				prisma.campaignMember.create({
					data: {
						id: newId(),
						campaignId,
						userId: currentUser.id,
						role: "gm",
					},
				}),
			]);

			set.status = 201;
			return { success: true as const, id: campaignId };
		},
		{
			body: CreateCampaignBody,
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				400: ErrorResponse,
				401: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Créer une campagne" },
		},
	)

	/** POST /campaigns/:id/cover - Téléverser l'image de couverture (propriétaire) */
	.post(
		"/:id/cover",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			const file = body.cover ?? body.file;
			if (!file || !(file instanceof File)) {
				set.status = 400;
				return {
					success: false as const,
					error: "Fichier manquant. Envoyez un champ 'cover' ou 'file'.",
				};
			}

			const buffer = Buffer.from(await file.arrayBuffer());
			const result = await uploadCoverHandler({
				campaignId: params.id,
				userId: currentUser.id,
				data: buffer,
				contentType: file.type || "image/jpeg",
			});

			if (!result.ok) {
				set.status = result.status;
				return { success: false as const, error: result.error };
			}

			set.status = 201;
			return {
				success: true as const,
				fileId: result.fileId,
				coverUrl: result.coverUrl,
			};
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				cover: t.Optional(t.File()),
				file: t.Optional(t.File()),
			}),
			response: {
				201: t.Object({
					success: t.Literal(true),
					fileId: t.String(),
					coverUrl: t.Union([t.String(), t.Null()]),
				}),
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Téléverser l'image de couverture",
			},
		},
	)

	/** PATCH /campaigns/:id - Modifier une campagne (propriétaire) */
	.patch(
		"/:id",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			if (campaign.ownerId !== currentUser.id) {
				set.status = 403;
				return {
					success: false as const,
					error: "Réservé au propriétaire",
				};
			}

			await prisma.campaign.update({
				where: { id: params.id },
				data: {
					nom: body.nom,
					description: body.description,
					isPublic: body.isPublic,
					status: body.status,
					tags: body.tags ? normalizeTags(body.tags) : undefined,
				},
			});
			return { success: true as const, message: "Campagne modifiée" };
		},
		{
			params: t.Object({ id: t.String() }),
			body: UpdateCampaignBody,
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Modifier une campagne" },
		},
	)

	/** DELETE /campaigns/:id - Supprimer une campagne (soft delete, propriétaire) */
	.delete(
		"/:id",
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
			if (campaign.ownerId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Réservé au propriétaire" };
			}

			await prisma.campaign.update({
				where: { id: params.id },
				data: { deletedAt: new Date() },
			});
			return { success: true as const, message: "Campagne supprimée" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Supprimer une campagne" },
		},
	)

	// ==================== MEMBRES ====================

	/** POST /campaigns/:id/join - Demander l'accès à une campagne publique */
	.post(
		"/:id/join",
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
			if (!campaign.isPublic) {
				set.status = 403;
				return { success: false as const, error: "Campagne privée" };
			}

			const member = await prisma.campaignMember.findFirst({
				where: { campaignId: params.id, userId: currentUser.id, leftAt: null },
			});
			if (member) {
				set.status = 409;
				return { success: false as const, error: "Déjà membre" };
			}

			const existing = await prisma.campaignJoinRequest.findUnique({
				where: {
					campaignId_userId: { campaignId: params.id, userId: currentUser.id },
				},
			});
			if (existing?.status === "pending") {
				set.status = 409;
				return { success: false as const, error: "Demande déjà envoyée" };
			}

			if (existing) {
				await prisma.campaignJoinRequest.update({
					where: { id: existing.id },
					data: { status: "pending" },
				});
			} else {
				await prisma.campaignJoinRequest.create({
					data: {
						id: newId(),
						campaignId: params.id,
						userId: currentUser.id,
					},
				});
			}
			set.status = 201;
			return { success: true as const, message: "Demande envoyée" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				201: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Demander l'accès" },
		},
	)

	/** GET /campaigns/:id/join-requests - Demandes en attente (MJ) */
	.get(
		"/:id/join-requests",
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			const items = await prisma.campaignJoinRequest.findMany({
				where: { campaignId: params.id, status: "pending" },
				orderBy: { createdAt: "asc" },
				include: { user: { select: { pseudo: true } } },
			});
			return { success: true as const, items };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(JoinRequestSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Demandes d'accès en attente" },
		},
	)

	/** POST /campaigns/:id/join-requests/:requestId/accept - Accepter (MJ) */
	.post(
		"/:id/join-requests/:requestId/accept",
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			const request = await prisma.campaignJoinRequest.findFirst({
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

			const existingMember = await prisma.campaignMember.findUnique({
				where: {
					campaignId_userId: {
						campaignId: params.id,
						userId: request.userId,
					},
				},
			});
			await prisma.$transaction([
				prisma.campaignJoinRequest.update({
					where: { id: request.id },
					data: { status: "accepted" },
				}),
				existingMember
					? prisma.campaignMember.update({
							where: { id: existingMember.id },
							data: { leftAt: null, role: "player", joinedAt: new Date() },
						})
					: prisma.campaignMember.create({
							data: {
								id: newId(),
								campaignId: params.id,
								userId: request.userId,
								role: "player",
							},
						}),
			]);
			return { success: true as const, message: "Demande acceptée" };
		},
		{
			params: t.Object({ id: t.String(), requestId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Accepter une demande" },
		},
	)

	/** POST /campaigns/:id/join-requests/:requestId/decline - Refuser (MJ) */
	.post(
		"/:id/join-requests/:requestId/decline",
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			const request = await prisma.campaignJoinRequest.findFirst({
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
			await prisma.campaignJoinRequest.update({
				where: { id: request.id },
				data: { status: "declined" },
			});
			return { success: true as const, message: "Demande refusée" };
		},
		{
			params: t.Object({ id: t.String(), requestId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Refuser une demande" },
		},
	)

	/** DELETE /campaigns/:id/leave - Quitter une campagne */
	.delete(
		"/:id/leave",
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
			if (campaign.ownerId === currentUser.id) {
				set.status = 400;
				return {
					success: false as const,
					error: "Le propriétaire ne peut pas quitter sa campagne",
				};
			}

			const member = await prisma.campaignMember.findFirst({
				where: { campaignId: params.id, userId: currentUser.id, leftAt: null },
			});
			if (!member) {
				set.status = 404;
				return { success: false as const, error: "Vous n'êtes pas membre" };
			}
			await prisma.campaignMember.update({
				where: { id: member.id },
				data: { leftAt: new Date() },
			});
			return { success: true as const, message: "Campagne quittée" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Quitter une campagne" },
		},
	)

	/** PUT /campaigns/:id/members/:userId/role - Changer le rôle (propriétaire) */
	.put(
		"/:id/members/:userId/role",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const campaign = await findActiveCampaign(params.id);
			if (!campaign) {
				set.status = 404;
				return { success: false as const, error: "Campagne introuvable" };
			}
			if (campaign.ownerId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Réservé au propriétaire" };
			}

			const member = await prisma.campaignMember.findFirst({
				where: { campaignId: params.id, userId: params.userId, leftAt: null },
			});
			if (!member) {
				set.status = 404;
				return { success: false as const, error: "Membre introuvable" };
			}
			await prisma.campaignMember.update({
				where: { id: member.id },
				data: { role: body.role },
			});
			return { success: true as const, message: "Rôle modifié" };
		},
		{
			params: t.Object({ id: t.String(), userId: t.String() }),
			body: t.Object({ role: MemberRole }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Changer le rôle d'un membre" },
		},
	)

	/** DELETE /campaigns/:id/members/:userId - Expulser un membre (propriétaire) */
	.delete(
		"/:id/members/:userId",
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
			if (campaign.ownerId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Réservé au propriétaire" };
			}
			if (params.userId === campaign.ownerId) {
				set.status = 400;
				return {
					success: false as const,
					error: "Impossible d'expulser le propriétaire",
				};
			}

			const member = await prisma.campaignMember.findFirst({
				where: { campaignId: params.id, userId: params.userId, leftAt: null },
			});
			if (!member) {
				set.status = 404;
				return { success: false as const, error: "Membre introuvable" };
			}
			await prisma.campaignMember.update({
				where: { id: member.id },
				data: { leftAt: new Date() },
			});
			return { success: true as const, message: "Membre expulsé" };
		},
		{
			params: t.Object({ id: t.String(), userId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Expulser un membre" },
		},
	)

	// ==================== SESSIONS ====================

	/** GET /campaigns/:id/sessions - Liste des sessions (membre) */
	.get(
		"/:id/sessions",
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
			if (campaign.ownerId !== currentUser.id && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const items = await prisma.session.findMany({
				where: { campaignId: params.id },
				orderBy: { createdAt: "desc" },
			});
			return { success: true as const, items };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(SessionSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Sessions d'une campagne" },
		},
	)

	/** POST /campaigns/:id/sessions - Créer une session (MJ/propriétaire) */
	.post(
		"/:id/sessions",
		async ({ set, currentUser, params, body }) => {
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const created = await prisma.session.create({
				data: {
					id: newId(),
					campaignId: params.id,
					nom: body.nom,
					scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
				},
			});
			set.status = 201;
			return { success: true as const, id: created.id };
		},
		{
			params: t.Object({ id: t.String() }),
			body: CreateSessionBody,
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Créer une session" },
		},
	)

	/** PUT /campaigns/:id/sessions/:sessionId - Modifier une session (MJ/propriétaire) */
	.put(
		"/:id/sessions/:sessionId",
		async ({ set, currentUser, params, body }) => {
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const session = await prisma.session.findFirst({
				where: { id: params.sessionId, campaignId: params.id },
			});
			if (!session) {
				set.status = 404;
				return { success: false as const, error: "Session introuvable" };
			}

			// Horodatage automatique des transitions de statut : lancer une
			// session renseigne startedAt, la terminer renseigne endedAt.
			const data: {
				nom?: string;
				status?: typeof body.status;
				scheduledAt?: Date;
				startedAt?: Date;
				endedAt?: Date;
			} = {
				nom: body.nom,
				status: body.status,
				scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
			};
			if (body.status === "active" && !session.startedAt) {
				data.startedAt = new Date();
			}
			if (body.status === "ended" && !session.endedAt) {
				data.endedAt = new Date();
			}

			await prisma.session.update({
				where: { id: params.sessionId },
				data,
			});
			return { success: true as const, message: "Session modifiée" };
		},
		{
			params: t.Object({ id: t.String(), sessionId: t.String() }),
			body: UpdateSessionBody,
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Modifier une session" },
		},
	)

	/** DELETE /campaigns/:id/sessions/:sessionId - Supprimer une session (MJ/propriétaire) */
	.delete(
		"/:id/sessions/:sessionId",
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const session = await prisma.session.findFirst({
				where: { id: params.sessionId, campaignId: params.id },
			});
			if (!session) {
				set.status = 404;
				return { success: false as const, error: "Session introuvable" };
			}
			await prisma.session.delete({ where: { id: params.sessionId } });
			return { success: true as const, message: "Session supprimée" };
		},
		{
			params: t.Object({ id: t.String(), sessionId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Supprimer une session" },
		},
	)

	// ==================== CHAT ====================

	/** GET /campaigns/:id/messages - Historique du chat (membre) */
	.get(
		"/:id/messages",
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
			if (campaign.ownerId !== currentUser.id && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			const rows = await prisma.message.findMany({
				where: { campaignId: params.id },
				orderBy: { createdAt: "desc" },
				take: 50,
				include: { user: { select: { pseudo: true } } },
			});
			return { success: true as const, items: rows.reverse() };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(MessageSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Historique du chat" },
		},
	)

	/** POST /campaigns/:id/messages - Envoyer un message (membre) */
	.post(
		"/:id/messages",
		async ({ set, currentUser, params, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await postMessageHandler({
				campaignId: params.id,
				userId: currentUser.id,
				content: body.content,
			});
			if (!result.ok) {
				set.status = result.status;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			return { success: true as const, message: result.message };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({ content: t.String({ maxLength: MAX_MESSAGE_LENGTH }) }),
			response: {
				201: t.Object({ success: t.Literal(true), message: MessageSchema }),
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Envoyer un message" },
		},
	)

	/** GET /campaigns/:id/messages/stream - Flux SSE temps réel (membre) */
	.get("/:id/messages/stream", async ({ set, currentUser, params }) => {
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
		if (campaign.ownerId !== currentUser.id && !role) {
			set.status = 403;
			return { success: false as const, error: "Accès refusé" };
		}

		const channel = chatChannel(params.id);
		const sub = redis.duplicate();
		const encoder = new TextEncoder();
		let heartbeat: ReturnType<typeof setInterval> | undefined;

		const stream = new ReadableStream({
			async start(controller) {
				controller.enqueue(encoder.encode(": connected\n\n"));
				sub.on("message", (_channel, payload) => {
					controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
				});
				await sub.subscribe(channel);
				heartbeat = setInterval(() => {
					controller.enqueue(encoder.encode(": ping\n\n"));
				}, 25_000);
			},
			async cancel() {
				if (heartbeat) clearInterval(heartbeat);
				await sub.unsubscribe(channel).catch(() => {});
				sub.disconnect();
			},
		});

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	})

	// ==================== FICHES DE PERSONNAGE ====================

	/** POST /campaigns/:id/character-sheets/:sheetId - Importer une fiche (FEAT-178) */
	.post(
		"/:id/character-sheets/:sheetId",
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
			if (campaign.status === "archived") {
				set.status = 409;
				return { success: false as const, error: "Campagne archivée" };
			}

			// (1) La fiche doit exister et appartenir à l'utilisateur courant.
			const sheet = await prisma.characterSheet.findFirst({
				where: { id: params.sheetId, deletedAt: null },
			});
			if (!sheet) {
				set.status = 404;
				return { success: false as const, error: "Fiche introuvable" };
			}
			if (sheet.userId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Fiche non possédée" };
			}

			// (2) L'utilisateur doit être membre actif de la campagne.
			const role = await memberRole(params.id, currentUser.id);
			if (campaign.ownerId !== currentUser.id && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			// (3) Compatibilité système : identique, ou lien parent/enfant dans
			// l'un ou l'autre sens (fork).
			if (sheet.gameSystemId !== campaign.gameSystemId) {
				const [sheetSystem, campaignSystem] = await Promise.all([
					prisma.gameSystem.findUnique({
						where: { id: sheet.gameSystemId },
						select: { parentSystemId: true },
					}),
					prisma.gameSystem.findUnique({
						where: { id: campaign.gameSystemId },
						select: { parentSystemId: true },
					}),
				]);
				const compatible =
					sheetSystem?.parentSystemId === campaign.gameSystemId ||
					campaignSystem?.parentSystemId === sheet.gameSystemId;
				if (!compatible) {
					set.status = 409;
					return {
						success: false as const,
						error:
							"La fiche n'est pas compatible avec le système de la campagne",
					};
				}
			}

			try {
				const created = await prisma.campaignCharacterSheet.create({
					data: {
						id: newId(),
						campaignId: params.id,
						characterSheetId: params.sheetId,
					},
				});
				set.status = 201;
				return { success: true as const, id: created.id };
			} catch (err) {
				if ((err as { code?: string }).code === PRISMA_UNIQUE_VIOLATION) {
					set.status = 409;
					return {
						success: false as const,
						error: "Fiche déjà liée à la campagne",
					};
				}
				throw err;
			}
		},
		{
			params: t.Object({ id: t.String(), sheetId: t.String() }),
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Importer une fiche" },
		},
	)

	/** GET /campaigns/:id/character-sheets - Fiches liées (FEAT-179) */
	.get(
		"/:id/character-sheets",
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
			const isGm = campaign.ownerId === currentUser.id || role === "gm";
			if (campaign.ownerId !== currentUser.id && !role) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			// Le MJ voit toutes les fiches ; un joueur ne voit que les siennes.
			const rows = await prisma.campaignCharacterSheet.findMany({
				where: {
					campaignId: params.id,
					...(isGm ? {} : { characterSheet: { userId: currentUser.id } }),
				},
				include: {
					characterSheet: { select: { userId: true, name: true } },
				},
			});

			const sheets = rows.map((row) => ({
				id: row.id,
				characterSheetId: row.characterSheetId,
				userId: row.characterSheet.userId,
				name: row.characterSheet.name,
			}));
			return { success: true as const, sheets };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					sheets: t.Array(CampaignCharacterSheetSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Fiches liées à la campagne" },
		},
	)

	/** DELETE /campaigns/:id/character-sheets/:sheetId - Retirer une fiche (FEAT-180) */
	.delete(
		"/:id/character-sheets/:sheetId",
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
			const isGm = campaign.ownerId === currentUser.id || role === "gm";

			const link = await prisma.campaignCharacterSheet.findFirst({
				where: { campaignId: params.id, characterSheetId: params.sheetId },
				include: { characterSheet: { select: { userId: true } } },
			});
			if (!link) {
				set.status = 404;
				return { success: false as const, error: "Fiche non liée" };
			}

			// Réservé au propriétaire de la fiche ou au MJ.
			if (!isGm && link.characterSheet.userId !== currentUser.id) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}

			await prisma.campaignCharacterSheet.delete({ where: { id: link.id } });
			return { success: true as const, message: "Fiche retirée" };
		},
		{
			params: t.Object({ id: t.String(), sheetId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Retirer une fiche" },
		},
	)

	// ==================== INVITATIONS ====================

	/** POST /campaigns/:id/invites - Créer un lien d'invitation (MJ/propriétaire) */
	.post(
		"/:id/invites",
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
			if (campaign.ownerId !== currentUser.id && role !== "gm") {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}

			const token = generateInviteToken();
			const expiresAt = new Date(
				Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
			);
			await prisma.campaignInvite.create({
				data: {
					id: newId(),
					campaignId: params.id,
					token,
					createdBy: currentUser.id,
					expiresAt,
				},
			});
			set.status = 201;
			return { success: true as const, token, expiresAt };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				201: t.Object({
					success: t.Literal(true),
					token: t.String(),
					expiresAt: t.Date(),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Créer un lien d'invitation" },
		},
	)

	/** GET /campaigns/invites/:token - Prévisualiser une invitation (sans rejoindre) */
	.get(
		"/invites/:token",
		async ({ set, params }) => {
			const invite = await prisma.campaignInvite.findUnique({
				where: { token: params.token },
				include: { campaign: true },
			});
			if (!invite || invite.campaign.deletedAt) {
				set.status = 404;
				return { success: false as const, error: "Invitation introuvable" };
			}
			if (invite.expiresAt < new Date()) {
				set.status = 410;
				return { success: false as const, error: "Invitation expirée" };
			}
			return {
				success: true as const,
				campaign: {
					id: invite.campaign.id,
					nom: invite.campaign.nom,
					description: invite.campaign.description,
				},
				expiresAt: invite.expiresAt,
			};
		},
		{
			params: t.Object({ token: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					campaign: t.Object({
						id: t.String(),
						nom: t.String(),
						description: t.Union([t.String(), t.Null()]),
					}),
					expiresAt: t.Date(),
				}),
				404: ErrorResponse,
				410: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Prévisualiser une invitation" },
		},
	)

	/** POST /campaigns/invites/:token/accept - Rejoindre une campagne via un lien */
	.post(
		"/invites/:token/accept",
		async ({ set, currentUser, params }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const invite = await prisma.campaignInvite.findUnique({
				where: { token: params.token },
				include: { campaign: true },
			});
			if (!invite || invite.campaign.deletedAt) {
				set.status = 404;
				return { success: false as const, error: "Invitation introuvable" };
			}
			if (invite.expiresAt < new Date()) {
				set.status = 410;
				return { success: false as const, error: "Invitation expirée" };
			}

			const campaignId = invite.campaignId;
			if (invite.campaign.ownerId === currentUser.id) {
				return { success: true as const, campaignId };
			}

			const existing = await prisma.campaignMember.findUnique({
				where: {
					campaignId_userId: { campaignId, userId: currentUser.id },
				},
			});
			if (existing) {
				if (existing.leftAt !== null) {
					await prisma.campaignMember.update({
						where: { id: existing.id },
						data: { leftAt: null, role: "player", joinedAt: new Date() },
					});
				}
			} else {
				await prisma.campaignMember.create({
					data: {
						id: newId(),
						campaignId,
						userId: currentUser.id,
						role: "player",
					},
				});
			}
			return { success: true as const, campaignId };
		},
		{
			params: t.Object({ token: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true), campaignId: t.String() }),
				401: ErrorResponse,
				404: ErrorResponse,
				410: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Rejoindre via une invitation" },
		},
	);
