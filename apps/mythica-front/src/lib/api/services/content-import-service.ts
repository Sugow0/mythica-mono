/**
 * Service d'import de contenu — API admin du gameplay service.
 */

import { ApiError } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImportJobStatus =
	| "scanning"
	| "ready"
	| "applying"
	| "applied"
	| "failed";

export type ImportItemStatus = "pending" | "approved" | "rejected";

export type ContentImportJob = {
	id: string;
	gameSystemId: string;
	collection: string;
	status: ImportJobStatus;
	totalFound: number;
	totalFetched: number;
	totalNew: number;
	totalUpdated: number;
	createdAt: string;
	completedAt: string | null;
	appliedAt: string | null;
	errorMessage: string | null;
	_count: { items: number };
};

export type ContentImportItem = {
	id: string;
	jobId: string;
	slug: string;
	name: string | null;
	description: string | null;
	isNew: boolean;
	existingId: string | null;
	status: ImportItemStatus;
	reviewedAt: string | null;
};

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

// ─── Collections disponibles ──────────────────────────────────────────────────

export const AIDEDD_COLLECTIONS = [
	"sorts",
	"dons",
	"invocations",
	"monstres",
	"poisons",
	"herbes",
	"om",
] as const;

export type AideddCollection = (typeof AIDEDD_COLLECTIONS)[number];

export const COLLECTION_LABELS: Record<AideddCollection, string> = {
	sorts: "Sorts",
	dons: "Dons",
	invocations: "Invocations occultes",
	monstres: "Monstres",
	poisons: "Poisons",
	herbes: "Herbes",
	om: "Objets magiques",
};

// ─── Client ───────────────────────────────────────────────────────────────────

function gameplayBase(): string {
	return `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay`;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`${gameplayBase()}${path}`, {
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init.headers },
		...init,
	});
	if (!res.ok) {
		let msg = `HTTP ${res.status}`;
		try {
			const body = await res.clone().json();
			if (body.error) msg = body.error;
		} catch (_) {
			// réponse non-JSON : on garde le message HTTP par défaut
		}
		throw new ApiError(msg, res.status);
	}
	return res.json() as Promise<T>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const contentImportService = {
	/** Créer un job de scan (démarre immédiatement en background). */
	async startScan(
		gameSystemId: string,
		collection: string
	): Promise<{ jobId: string }> {
		const res = await apiFetch<{ success: true; jobId: string }>(
			"/admin/content-imports",
			{ method: "POST", body: JSON.stringify({ gameSystemId, collection }) }
		);
		return { jobId: res.jobId };
	},

	/** Lister tous les jobs. */
	async listJobs(gameSystemId?: string): Promise<ContentImportJob[]> {
		const qs = gameSystemId ? `?gameSystemId=${gameSystemId}` : "";
		const res = await apiFetch<{ success: true; jobs: ContentImportJob[] }>(
			`/admin/content-imports${qs}`
		);
		return res.jobs;
	},

	/** Détail d'un job. */
	async getJob(jobId: string): Promise<ContentImportJob> {
		const res = await apiFetch<{ success: true; job: ContentImportJob }>(
			`/admin/content-imports/${jobId}`
		);
		return res.job;
	},

	/** Items d'un job (paginés). */
	async listItems(
		jobId: string,
		opts: {
			status?: ImportItemStatus;
			isNew?: boolean;
			page?: number;
			perPage?: number;
		} = {}
	): Promise<{
		items: ContentImportItem[];
		total: number;
		page: number;
		perPage: number;
	}> {
		const params = new URLSearchParams();
		if (opts.status) params.set("status", opts.status);
		if (opts.isNew !== undefined) params.set("isNew", String(opts.isNew));
		if (opts.page) params.set("page", String(opts.page));
		if (opts.perPage) params.set("perPage", String(opts.perPage));
		const qs = params.size ? `?${params}` : "";
		return apiFetch(`/admin/content-imports/${jobId}/items${qs}`);
	},

	/** Approuver ou rejeter un item. */
	async reviewItem(
		jobId: string,
		itemId: string,
		status: "approved" | "rejected"
	): Promise<void> {
		await apiFetch(`/admin/content-imports/${jobId}/items/${itemId}`, {
			method: "PATCH",
			body: JSON.stringify({ status }),
		});
	},

	/** Approuver ou rejeter en masse. */
	async batchReview(
		jobId: string,
		action: "approve" | "reject",
		ids?: string[]
	): Promise<{ count: number }> {
		return apiFetch(`/admin/content-imports/${jobId}/items/batch`, {
			method: "POST",
			body: JSON.stringify({ action, ids }),
		});
	},

	/** Appliquer les items approuvés dans SystemContent. */
	async applyJob(jobId: string): Promise<{ applied: number }> {
		return apiFetch(`/admin/content-imports/${jobId}/apply`, {
			method: "POST",
			body: JSON.stringify({}),
		});
	},

	/** Ouvrir un flux SSE pour la progression du scan. */
	streamProgress(
		jobId: string,
		onEvent: (p: ScanProgress) => void
	): () => void {
		const url = `${gameplayBase()}/admin/content-imports/${jobId}/stream`;
		const es = new EventSource(url, { withCredentials: true });
		es.onmessage = (e) => {
			try {
				onEvent(JSON.parse(e.data) as ScanProgress);
			} catch (_) {
				// événement SSE non-JSON : ignoré
			}
		};
		es.onerror = () => es.close();
		return () => es.close();
	},
};
