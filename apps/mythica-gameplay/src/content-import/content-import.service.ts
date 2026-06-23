/**
 * Service d'import de contenu : scan aidedd → staging Postgres → apply.
 *
 * Le scan tourne en background (fire-and-forget) ; la progression est
 * diffusée via SSE depuis le controller. Les items sont stockés dans
 * content_import_items avec status=pending jusqu'à la review admin.
 */

import { prisma } from "../lib/prisma";
import { logger } from "../logger";
import {
	AIDEDD_COLLECTIONS,
	type AideddCollection,
	COLLECTION_KEY_MAP,
	detailUrl,
	extractSlugs,
	fetchHtml,
	parseDetailPage,
} from "./aidedd-scraper";

const DELAY_MS = 450;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Progression (in-memory, pour SSE) ───────────────────────────────────────

export type ScanProgress = {
	jobId: string;
	status: "scanning" | "ready" | "failed";
	totalFound: number;
	totalFetched: number;
	totalNew: number;
	totalUpdated: number;
	currentSlug?: string;
	error?: string;
};

const progressListeners = new Map<string, Set<(p: ScanProgress) => void>>();

export function subscribeProgress(
	jobId: string,
	cb: (p: ScanProgress) => void,
): () => void {
	if (!progressListeners.has(jobId)) progressListeners.set(jobId, new Set());
	const listeners = progressListeners.get(jobId);
	if (listeners) listeners.add(cb);
	return () => progressListeners.get(jobId)?.delete(cb);
}

function emit(jobId: string, p: ScanProgress) {
	progressListeners.get(jobId)?.forEach((cb) => {
		cb(p);
	});
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

export async function createAndStartScan(
	gameSystemId: string,
	collection: AideddCollection,
): Promise<string> {
	// Empêche les scans simultanés sur la même collection / game system
	const running = await prisma.contentImportJob.findFirst({
		where: { gameSystemId, collection, status: "scanning" },
		select: { id: true },
	});
	if (running) {
		throw new Error(
			`Un scan est déjà en cours pour cette collection (job ${running.id})`,
		);
	}

	const job = await prisma.contentImportJob.create({
		data: {
			gameSystemId,
			collection,
			status: "scanning",
		},
	});

	// Fire-and-forget — ne pas await
	runScan(job.id, gameSystemId, collection).catch((err) => {
		logger.error({ err, jobId: job.id }, "Scan failed unexpectedly");
	});

	return job.id;
}

async function runScan(
	jobId: string,
	gameSystemId: string,
	collection: AideddCollection,
): Promise<void> {
	const config = AIDEDD_COLLECTIONS[collection];
	const collectionKey = COLLECTION_KEY_MAP[collection];

	const progress: ScanProgress = {
		jobId,
		status: "scanning",
		totalFound: 0,
		totalFetched: 0,
		totalNew: 0,
		totalUpdated: 0,
	};

	try {
		// 1. Récupérer les slugs de l'index
		const indexHtml = await fetchHtml(config.indexUrl);
		const slugs = extractSlugs(indexHtml, config.slugParam);

		if (slugs.length === 0) {
			throw new Error(`Aucun slug trouvé sur ${config.indexUrl}`);
		}

		progress.totalFound = slugs.length;
		await prisma.contentImportJob.update({
			where: { id: jobId },
			data: { totalFound: slugs.length },
		});
		emit(jobId, { ...progress });

		// 2. Charger les contenus existants pour le diff
		const existing = await prisma.systemContent.findMany({
			where: { gameSystemId, collectionKey },
			select: { id: true, slug: true, name: true, description: true },
		});
		const existingBySlug = new Map(existing.map((e) => [e.slug, e]));

		// 3. Fetch chaque page de détail
		for (const slug of slugs) {
			progress.currentSlug = slug;
			emit(jobId, { ...progress });

			try {
				const url = detailUrl(config, slug);
				const html = await fetchHtml(url);
				const item = parseDetailPage(html, slug);

				const existing = existingBySlug.get(slug);
				const isNew = !existing;
				const hasChanges =
					!isNew &&
					(existing.name !== item.name ||
						existing.description !== item.description);

				// On ne stocke que les items nouveaux ou modifiés
				if (isNew || hasChanges) {
					await prisma.contentImportItem.upsert({
						where: { jobId_slug: { jobId, slug } },
						create: {
							jobId,
							slug,
							name: item.name || null,
							description: item.description || null,
							isNew,
							existingId: existing?.id ?? null,
							status: "pending",
						},
						update: {
							name: item.name || null,
							description: item.description || null,
						},
					});

					if (isNew) progress.totalNew++;
					else progress.totalUpdated++;
				}

				progress.totalFetched++;
				await prisma.contentImportJob.update({
					where: { id: jobId },
					data: {
						totalFetched: progress.totalFetched,
						totalNew: progress.totalNew,
						totalUpdated: progress.totalUpdated,
					},
				});
			} catch (err) {
				logger.warn({ err, slug, jobId }, "Erreur fetch slug");
			}

			emit(jobId, { ...progress });
			await delay(DELAY_MS);
		}

		// 4. Marquer le job comme prêt
		await prisma.contentImportJob.update({
			where: { id: jobId },
			data: { status: "ready", completedAt: new Date() },
		});
		progress.status = "ready";
		progress.currentSlug = undefined;
		emit(jobId, { ...progress });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		await prisma.contentImportJob.update({
			where: { id: jobId },
			data: { status: "failed", errorMessage },
		});
		progress.status = "failed";
		progress.error = errorMessage;
		emit(jobId, { ...progress });
		throw err;
	}
}

// ─── Review ───────────────────────────────────────────────────────────────────

export async function reviewItem(
	itemId: string,
	status: "approved" | "rejected",
) {
	return prisma.contentImportItem.update({
		where: { id: itemId },
		data: { status, reviewedAt: new Date() },
	});
}

export async function batchReview(
	jobId: string,
	action: "approve" | "reject",
	itemIds?: string[],
) {
	const status = action === "approve" ? "approved" : "rejected";
	const where = itemIds?.length
		? { jobId, id: { in: itemIds } }
		: { jobId, status: "pending" as const };
	return prisma.contentImportItem.updateMany({ where, data: { status } });
}

// ─── Apply ────────────────────────────────────────────────────────────────────

export async function applyJob(jobId: string): Promise<{ applied: number }> {
	const job = await prisma.contentImportJob.findUniqueOrThrow({
		where: { id: jobId },
		include: { items: { where: { status: "approved" } } },
	});

	const collectionKey = COLLECTION_KEY_MAP[job.collection as AideddCollection];

	await prisma.contentImportJob.update({
		where: { id: jobId },
		data: { status: "applying" },
	});

	// Traitement par batch de 20 pour éviter une file séquentielle trop longue
	// sur les grandes collections (428 monstres, 300+ sorts).
	const BATCH = 20;
	let applied = 0;
	for (let i = 0; i < job.items.length; i += BATCH) {
		const batch = job.items.slice(i, i + BATCH);
		await Promise.all(
			batch.map(async (item) => {
				if (item.existingId) {
					await prisma.systemContent.update({
						where: { id: item.existingId },
						data: {
							name: item.name ?? undefined,
							description: item.description ?? undefined,
						},
					});
				} else {
					await prisma.systemContent.upsert({
						where: {
							gameSystemId_collectionKey_slug: {
								gameSystemId: job.gameSystemId,
								collectionKey,
								slug: item.slug,
							},
						},
						create: {
							id: crypto.randomUUID(),
							gameSystemId: job.gameSystemId,
							collectionKey,
							slug: item.slug,
							name: item.name ?? item.slug,
							description: item.description ?? null,
							data: {},
						},
						update: {
							name: item.name ?? undefined,
							description: item.description ?? undefined,
						},
					});
				}
				applied++;
			}),
		);
	}

	await prisma.contentImportJob.update({
		where: { id: jobId },
		data: { status: "applied", appliedAt: new Date() },
	});

	return { applied };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listJobs(gameSystemId?: string) {
	return prisma.contentImportJob.findMany({
		where: gameSystemId ? { gameSystemId } : undefined,
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			gameSystemId: true,
			collection: true,
			status: true,
			totalFound: true,
			totalFetched: true,
			totalNew: true,
			totalUpdated: true,
			createdAt: true,
			completedAt: true,
			appliedAt: true,
			errorMessage: true,
			_count: { select: { items: true } },
		},
	});
}

export async function getJob(jobId: string) {
	return prisma.contentImportJob.findUnique({
		where: { id: jobId },
		include: {
			_count: {
				select: {
					items: true,
				},
			},
		},
	});
}

export async function listItems(
	jobId: string,
	opts: {
		status?: "pending" | "approved" | "rejected";
		isNew?: boolean;
		page?: number;
		perPage?: number;
	} = {},
) {
	const page = Math.max(1, opts.page ?? 1);
	const perPage = Math.min(100, opts.perPage ?? 50);
	const skip = (page - 1) * perPage;

	const where = {
		jobId,
		...(opts.status ? { status: opts.status } : {}),
		...(opts.isNew !== undefined ? { isNew: opts.isNew } : {}),
	};

	const [items, total] = await Promise.all([
		prisma.contentImportItem.findMany({
			where,
			orderBy: [{ isNew: "desc" }, { slug: "asc" }],
			skip,
			take: perPage,
		}),
		prisma.contentImportItem.count({ where }),
	]);

	return { items, total, page, perPage };
}
