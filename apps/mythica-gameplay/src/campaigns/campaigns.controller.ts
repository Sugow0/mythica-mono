import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { ErrorResponse, SuccessMessageResponse } from "../lib/http";
import { prisma } from "../lib/prisma";

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
	coverFileId: t.Union([t.String(), t.Null()]),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

const MemberSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	userId: t.String({ format: "uuid" }),
	role: MemberRole,
	joinedAt: t.Date(),
	leftAt: t.Union([t.Date(), t.Null()]),
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

const CreateCampaignBody = t.Object({
	nom: t.String({ minLength: 1, maxLength: 255 }),
	gameSystemId: t.String({ format: "uuid" }),
	description: t.Optional(t.String()),
	isPublic: t.Optional(t.Boolean()),
});

const UpdateCampaignBody = t.Object({
	nom: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	description: t.Optional(t.String()),
	isPublic: t.Optional(t.Boolean()),
	status: t.Optional(CampaignStatus),
});

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

			const [items, total] = await Promise.all([
				prisma.campaign.findMany({
					where,
					skip: (page - 1) * limit,
					take: limit,
					orderBy: { createdAt: "desc" },
				}),
				prisma.campaign.count({ where }),
			]);

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

			const items = await prisma.campaign.findMany({
				where: {
					deletedAt: null,
					OR: [
						{ ownerId: currentUser.id },
						{ members: { some: { userId: currentUser.id, leftAt: null } } },
					],
				},
				orderBy: { updatedAt: "desc" },
			});

			return { success: true as const, items };
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
					items: t.Array(CampaignSchema),
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
				include: { members: { where: { leftAt: null } } },
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

			const { members, ...rest } = campaign;
			return { success: true as const, campaign: rest, members };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					campaign: CampaignSchema,
					members: t.Array(MemberSchema),
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

			const campaignId = crypto.randomUUID();
			await prisma.$transaction([
				prisma.campaign.create({
					data: {
						id: campaignId,
						ownerId: currentUser.id,
						gameSystemId: body.gameSystemId,
						nom: body.nom,
						description: body.description ?? null,
						isPublic: body.isPublic ?? false,
					},
				}),
				prisma.campaignMember.create({
					data: {
						id: crypto.randomUUID(),
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

	/** PUT /campaigns/:id - Modifier une campagne (propriétaire) */
	.put(
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

	/** POST /campaigns/:id/join - Rejoindre une campagne publique */
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

			const existing = await prisma.campaignMember.findUnique({
				where: {
					campaignId_userId: {
						campaignId: params.id,
						userId: currentUser.id,
					},
				},
			});
			if (existing && existing.leftAt === null) {
				set.status = 409;
				return { success: false as const, error: "Déjà membre" };
			}

			if (existing) {
				await prisma.campaignMember.update({
					where: { id: existing.id },
					data: { leftAt: null, role: "player", joinedAt: new Date() },
				});
			} else {
				await prisma.campaignMember.create({
					data: {
						id: crypto.randomUUID(),
						campaignId: params.id,
						userId: currentUser.id,
						role: "player",
					},
				});
			}
			return { success: true as const, message: "Campagne rejointe" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
				409: ErrorResponse,
			},
			detail: { tags: ["Campaigns"], summary: "Rejoindre une campagne" },
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
					id: crypto.randomUUID(),
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
			await prisma.session.update({
				where: { id: params.sessionId },
				data: {
					nom: body.nom,
					status: body.status,
					scheduledAt: body.scheduledAt
						? new Date(body.scheduledAt)
						: undefined,
				},
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
	);
