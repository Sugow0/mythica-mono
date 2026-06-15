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
// Résolution d'accès
// ------------------------------------------------------------

type SessionAccess =
	| {
			ok: true;
			session: SessionRow;
			campaign: CampaignRow;
			role: string | null;
	  }
	| { ok: false; status: 401 | 403 | 404; error: string };

type SessionRow = {
	id: string;
	campaignId: string;
	status: string;
	startedAt: Date | null;
};
type CampaignRow = { id: string; nom: string; ownerId: string };

/**
 * Résout la session et sa campagne, puis vérifie que l'utilisateur est membre
 * actif (ou propriétaire). Centralise les codes d'erreur partagés par toutes
 * les routes session.
 */
async function resolveSessionAccess(
	sessionId: string,
	user: CurrentUser | null,
): Promise<SessionAccess> {
	if (!user) return { ok: false, status: 401, error: "Non authentifié" };

	const session = (await prisma.session.findUnique({
		where: { id: sessionId },
	})) as SessionRow | null;
	if (!session) return { ok: false, status: 404, error: "Session introuvable" };

	const campaign = (await prisma.campaign.findFirst({
		where: { id: session.campaignId, deletedAt: null },
	})) as CampaignRow | null;
	if (!campaign)
		return { ok: false, status: 404, error: "Campagne introuvable" };

	const member = await prisma.campaignMember.findFirst({
		where: { campaignId: campaign.id, userId: user.id, leftAt: null },
	});
	const role = member?.role ?? null;
	if (campaign.ownerId !== user.id && !role)
		return { ok: false, status: 403, error: "Accès refusé" };

	return { ok: true, session, campaign, role };
}

/** Vrai si l'utilisateur est propriétaire ou MJ de la campagne. */
function isGameMaster(access: {
	campaign: CampaignRow;
	role: string | null;
}): (user: CurrentUser) => boolean {
	return (user) => access.campaign.ownerId === user.id || access.role === "gm";
}

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
	});
