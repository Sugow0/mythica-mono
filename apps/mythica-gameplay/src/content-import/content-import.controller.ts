/**
 * Controller d'import de contenu — routes admin uniquement.
 *
 * POST   /admin/content-imports                 → créer un job + démarrer le scan
 * GET    /admin/content-imports                 → liste des jobs
 * GET    /admin/content-imports/:jobId          → détail d'un job
 * GET    /admin/content-imports/:jobId/stream   → SSE progression temps réel
 * GET    /admin/content-imports/:jobId/items    → items paginés (avec filtres)
 * PATCH  /admin/content-imports/:jobId/items/:itemId → approve / reject
 * POST   /admin/content-imports/:jobId/items/batch   → batch approve / reject
 * POST   /admin/content-imports/:jobId/apply    → appliquer les items approuvés
 */

import { Elysia, t } from "elysia";
import { authContext, isAdmin } from "../auth/context";
import { ErrorResponse } from "../lib/http";
import { AIDEDD_COLLECTIONS, type AideddCollection } from "./aidedd-scraper";
import {
	applyJob,
	batchReview,
	createAndStartScan,
	getJob,
	listItems,
	listJobs,
	reviewItem,
	subscribeProgress,
} from "./content-import.service";

const VALID_COLLECTIONS = Object.keys(AIDEDD_COLLECTIONS) as AideddCollection[];

export const contentImportController = new Elysia({
	prefix: "/admin/content-imports",
})
	.use(authContext)

	// ── POST / — démarrer un scan ──────────────────────────────────────────────
	.post(
		"/",
		async ({ body, currentUser, set }) => {
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}
			const { gameSystemId, collection } = body;
			if (!VALID_COLLECTIONS.includes(collection as AideddCollection)) {
				set.status = 400;
				return {
					success: false as const,
					error: `Collection invalide. Valeurs : ${VALID_COLLECTIONS.join(", ")}`,
				};
			}
			const jobId = await createAndStartScan(
				gameSystemId,
				collection as AideddCollection,
			);
			set.status = 201;
			return { success: true as const, jobId };
		},
		{
			body: t.Object({
				gameSystemId: t.String({ format: "uuid" }),
				collection: t.String(),
			}),
			response: {
				201: t.Object({ success: t.Literal(true), jobId: t.String() }),
				400: ErrorResponse,
				403: ErrorResponse,
			},
		},
	)

	// ── GET / — liste des jobs ─────────────────────────────────────────────────
	.get(
		"/",
		async ({ query, currentUser, set }) => {
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}
			const jobs = await listJobs(query.gameSystemId);
			return { success: true as const, jobs };
		},
		{
			query: t.Object({ gameSystemId: t.Optional(t.String()) }),
		},
	)

	// ── GET /:jobId — détail d'un job ─────────────────────────────────────────
	.get("/:jobId", async ({ params, currentUser, set }) => {
		if (!isAdmin(currentUser)) {
			set.status = 403;
			return { success: false as const, error: "Accès refusé" };
		}
		const job = await getJob(params.jobId);
		if (!job) {
			set.status = 404;
			return { success: false as const, error: "Job introuvable" };
		}
		return { success: true as const, job };
	})

	// ── GET /:jobId/stream — SSE progression ──────────────────────────────────
	.get("/:jobId/stream", async ({ params, currentUser, set }) => {
		if (!isAdmin(currentUser)) {
			set.status = 403;
			return new Response(
				JSON.stringify({ success: false, error: "Accès refusé" }),
				{ status: 403 },
			);
		}

		const encoder = new TextEncoder();
		let unsubscribe: (() => void) | undefined;

		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(": connected\n\n"));

				unsubscribe = subscribeProgress(params.jobId, (p) => {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(p)}\n\n`));
					if (p.status === "ready" || p.status === "failed") {
						controller.close();
					}
				});
			},
			cancel() {
				unsubscribe?.();
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

	// ── GET /:jobId/items — items paginés ─────────────────────────────────────
	.get(
		"/:jobId/items",
		async ({ params, query, currentUser, set }) => {
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}
			const result = await listItems(params.jobId, {
				status: query.status as "pending" | "approved" | "rejected" | undefined,
				isNew: query.isNew !== undefined ? query.isNew === "true" : undefined,
				page: query.page ? Number(query.page) : 1,
				perPage: query.perPage ? Number(query.perPage) : 50,
			});
			return { success: true as const, ...result };
		},
		{
			query: t.Object({
				status: t.Optional(t.String()),
				isNew: t.Optional(t.String()),
				page: t.Optional(t.String()),
				perPage: t.Optional(t.String()),
			}),
		},
	)

	// ── PATCH /:jobId/items/:itemId — review individuelle ─────────────────────
	.patch(
		"/:jobId/items/:itemId",
		async ({ params, body, currentUser, set }) => {
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}
			await reviewItem(params.itemId, body.status);
			return { success: true as const };
		},
		{
			body: t.Object({
				status: t.Union([t.Literal("approved"), t.Literal("rejected")]),
			}),
		},
	)

	// ── POST /:jobId/items/batch — review en masse ────────────────────────────
	.post(
		"/:jobId/items/batch",
		async ({ params, body, currentUser, set }) => {
			if (!isAdmin(currentUser)) {
				set.status = 403;
				return { success: false as const, error: "Accès refusé" };
			}
			const result = await batchReview(params.jobId, body.action, body.ids);
			return { success: true as const, count: result.count };
		},
		{
			body: t.Object({
				action: t.Union([t.Literal("approve"), t.Literal("reject")]),
				ids: t.Optional(t.Array(t.String())),
			}),
		},
	)

	// ── POST /:jobId/apply — appliquer les items approuvés ────────────────────
	.post("/:jobId/apply", async ({ params, currentUser, set }) => {
		if (!isAdmin(currentUser)) {
			set.status = 403;
			return { success: false as const, error: "Accès refusé" };
		}
		const job = await getJob(params.jobId);
		if (!job) {
			set.status = 404;
			return { success: false as const, error: "Job introuvable" };
		}
		if (job.status !== "ready") {
			set.status = 409;
			return {
				success: false as const,
				error: `Le job est en statut "${job.status}", impossible d'appliquer`,
			};
		}
		const { applied } = await applyJob(params.jobId);
		return { success: true as const, applied };
	});
