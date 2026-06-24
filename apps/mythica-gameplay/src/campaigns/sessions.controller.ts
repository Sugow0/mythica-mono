import { Elysia, t } from "elysia";
import { authContext, type CurrentUser } from "../auth/context";
import { ErrorResponse } from "../lib/http";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import {
	announceStatus,
	joinPresence,
	leavePresence,
	presenceChannel,
} from "./commands/session-presence/session-presence.handler";
import { isGameMaster, resolveSessionAccess } from "./session-access";
import { sessionRooms } from "./session-rooms";
import { getSessionTokens } from "./session-tokens";

// ------------------------------------------------------------
// Schémas
// ------------------------------------------------------------

const SessionStatus = t.Union([
	t.Literal("scheduled"),
	t.Literal("active"),
	t.Literal("paused"),
	t.Literal("ended"),
]);

const MemberRole = t.Union([
	t.Literal("gm"),
	t.Literal("player"),
	t.Literal("spectator"),
]);

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

const MemberSchema = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	userId: t.String({ format: "uuid" }),
	role: MemberRole,
	joinedAt: t.Date(),
	leftAt: t.Union([t.Date(), t.Null()]),
	user: t.Object({ pseudo: t.Union([t.String(), t.Null()]) }),
});

const CampaignSummarySchema = t.Object({
	id: t.String({ format: "uuid" }),
	nom: t.String(),
	ownerId: t.String({ format: "uuid" }),
});

// ------------------------------------------------------------
// Controller
// ------------------------------------------------------------

export const sessionsController = new Elysia({ prefix: "/sessions" })
	.use(authContext)

	/** GET /sessions/:id - Détail d'une session (membre de la campagne). */
	.get(
		"/:id",
		async ({ set, currentUser, params }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}

			const members = await prisma.campaignMember.findMany({
				where: { campaignId: access.campaign.id, leftAt: null },
				orderBy: { joinedAt: "asc" },
				include: { user: { select: { pseudo: true } } },
			});

			return {
				success: true as const,
				session: access.session,
				campaign: {
					id: access.campaign.id,
					nom: access.campaign.nom,
					ownerId: access.campaign.ownerId,
				},
				members,
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					session: SessionSchema,
					campaign: CampaignSummarySchema,
					members: t.Array(MemberSchema),
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Sessions"], summary: "Détail d'une session" },
		},
	)

	/** POST /sessions/:id/launch - Lancer la session (MJ/propriétaire). */
	.post(
		"/:id/launch",
		async ({ set, currentUser, params }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			// currentUser est non-null dès lors que l'accès est accordé.
			if (!isGameMaster(access)(currentUser as CurrentUser)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			if (access.session.status === "ended") {
				set.status = 400;
				return { success: false as const, error: "Session déjà terminée" };
			}

			await prisma.session.update({
				where: { id: params.id },
				data: {
					status: "active",
					...(access.session.startedAt ? {} : { startedAt: new Date() }),
				},
			});
			await announceStatus(params.id, "active");

			return { success: true as const, status: "active" as const };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					status: t.Literal("active"),
				}),
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Sessions"], summary: "Lancer une session" },
		},
	)

	/** GET /sessions/:id/presence/stream - Flux SSE de présence (membre). */
	.get("/:id/presence/stream", async ({ set, currentUser, params }) => {
		const access = await resolveSessionAccess(params.id, currentUser);
		if (!access.ok) {
			set.status = access.status;
			return { success: false as const, error: access.error };
		}
		const userId = (currentUser as CurrentUser).id;

		const channel = presenceChannel(params.id);
		const sub = redis.duplicate();
		const encoder = new TextEncoder();
		let heartbeat: ReturnType<typeof setInterval> | undefined;

		// Enregistre la présence avant l'ouverture du flux : les autres abonnés
		// reçoivent immédiatement la liste à jour.
		const users = await joinPresence(params.id, userId);

		const stream = new ReadableStream({
			async start(controller) {
				controller.enqueue(encoder.encode(": connected\n\n"));
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify({ users })}\n\n`),
				);
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
				await leavePresence(params.id, userId);
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

	/** PUT /sessions/:id/map - Changer la map active d'une session (MJ). */
	.put(
		"/:id/map",
		async ({ set, currentUser, params, body }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			if (!isGameMaster(access)(currentUser as CurrentUser)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			const session = await prisma.session.update({
				where: { id: params.id },
				data: { activeMapId: body.mapId },
				include: { activeMap: true },
			});
			await sessionRooms.broadcast(params.id, {
				type: "MAP_CHANGE",
				mapId: body.mapId,
				map: session.activeMap,
			});
			return { success: true as const, session };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				mapId: t.Union([t.String({ format: "uuid" }), t.Null()]),
			}),
			response: {
				200: t.Object({
					success: t.Literal(true),
					session: t.Object({
						id: t.String(),
						activeMapId: t.Union([t.String({ format: "uuid" }), t.Null()]),
					}),
				}),
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Sessions"],
				summary: "Changer la map active d'une session",
			},
		},
	)

	/** GET /sessions/:id/tokens — Liste des tokens d'une session. */
	.get(
		"/:id/tokens",
		async ({ set, currentUser, params }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const tokens = await getSessionTokens(params.id);
			return { success: true as const, tokens };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true), tokens: t.Array(t.Any()) }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Sessions"], summary: "Tokens d'une session" },
		},
	)

	/** POST /sessions/:id/tokens — Créer un token (MJ). */
	.post(
		"/:id/tokens",
		async ({ set, currentUser, params, body }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			if (!isGameMaster(access)(currentUser as CurrentUser)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			const { randomUUID } = await import("node:crypto");
			const token = await prisma.sessionToken.create({
				data: { id: randomUUID(), sessionId: params.id, ...body },
			});
			await sessionRooms.broadcast(
				params.id,
				JSON.stringify({ type: "TOKEN_ADDED", token }),
			);
			set.status = 201;
			return { success: true as const, token };
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Object({
				characterSheetId: t.Optional(t.String({ format: "uuid" })),
				label: t.Optional(t.String({ maxLength: 255 })),
				fileId: t.Optional(t.String({ format: "uuid" })),
				posX: t.Number({ default: 0 }),
				posY: t.Number({ default: 0 }),
				width: t.Optional(t.Integer({ minimum: 1, default: 1 })),
				height: t.Optional(t.Integer({ minimum: 1, default: 1 })),
				isVisible: t.Optional(t.Boolean({ default: true })),
				layer: t.Optional(
					t.Union([
						t.Literal("background"),
						t.Literal("object"),
						t.Literal("token"),
						t.Literal("gm"),
					]),
				),
			}),
			response: {
				201: t.Object({ success: t.Literal(true), token: t.Any() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Sessions"], summary: "Créer un token (MJ)" },
		},
	)

	/** PATCH /sessions/:id/tokens/:tokenId — Modifier un token. */
	.patch(
		"/:id/tokens/:tokenId",
		async ({ set, currentUser, params, body }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			const existing = await prisma.sessionToken.findFirst({
				where: { id: params.tokenId, sessionId: params.id },
			});
			if (!existing) {
				set.status = 404;
				return { success: false as const, error: "Token introuvable" };
			}
			const token = await prisma.sessionToken.update({
				where: { id: params.tokenId },
				data: body,
			});
			await sessionRooms.broadcast(
				params.id,
				JSON.stringify({
					type: "TOKEN_UPDATED",
					tokenId: params.tokenId,
					...body,
				}),
			);
			return { success: true as const, token };
		},
		{
			params: t.Object({ id: t.String(), tokenId: t.String() }),
			body: t.Partial(
				t.Object({
					posX: t.Number(),
					posY: t.Number(),
					width: t.Integer(),
					height: t.Integer(),
					isVisible: t.Boolean(),
					label: t.String({ maxLength: 255 }),
				}),
			),
			response: {
				200: t.Object({ success: t.Literal(true), token: t.Any() }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Sessions"], summary: "Modifier un token" },
		},
	)

	/** DELETE /sessions/:id/tokens/:tokenId — Supprimer un token (MJ). */
	.delete(
		"/:id/tokens/:tokenId",
		async ({ set, currentUser, params }) => {
			const access = await resolveSessionAccess(params.id, currentUser);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}
			if (!isGameMaster(access)(currentUser as CurrentUser)) {
				set.status = 403;
				return { success: false as const, error: "Réservé au MJ" };
			}
			const existing = await prisma.sessionToken.findFirst({
				where: { id: params.tokenId, sessionId: params.id },
			});
			if (!existing) {
				set.status = 404;
				return { success: false as const, error: "Token introuvable" };
			}
			await prisma.sessionToken.delete({ where: { id: params.tokenId } });
			await sessionRooms.broadcast(
				params.id,
				JSON.stringify({ type: "TOKEN_REMOVED", tokenId: params.tokenId }),
			);
			return { success: true as const };
		},
		{
			params: t.Object({ id: t.String(), tokenId: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true) }),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: { tags: ["Sessions"], summary: "Supprimer un token (MJ)" },
		},
	);
