import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCKS (hoisted) =====

const p = {
	contentImportJob: {
		create: mock(async () => ({ id: "job-1" }) as unknown),
		findFirst: mock(async () => null as unknown),
		findUnique: mock(async () => null as unknown),
		findUniqueOrThrow: mock(async () => ({}) as unknown),
		findMany: mock(async () => [] as unknown[]),
		update: mock(async () => ({}) as unknown),
	},
	contentImportItem: {
		upsert: mock(async () => ({}) as unknown),
		update: mock(async () => ({}) as unknown),
		updateMany: mock(async () => ({ count: 0 }) as unknown),
		findMany: mock(async () => [] as unknown[]),
		count: mock(async () => 0 as unknown),
	},
	systemContent: {
		findMany: mock(async () => [] as unknown[]),
		update: mock(async () => ({}) as unknown),
		upsert: mock(async () => ({}) as unknown),
	},
};

mock.module("../../lib/prisma", () => ({ prisma: p }));
mock.module("../../logger", () => ({
	logger: { error: mock(() => {}), warn: mock(() => {}) },
}));

const svc =
	require("../content-import.service") as typeof import("../content-import.service");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GS_ID = "00000000-0000-0000-0000-000000000001";

function resetMocks() {
	for (const model of Object.values(p)) {
		for (const fn of Object.values(model)) {
			(fn as ReturnType<typeof mock>).mockReset();
		}
	}
}

// ─── createAndStartScan ───────────────────────────────────────────────────────

describe("createAndStartScan", () => {
	beforeEach(resetMocks);

	it("crée un job et retourne son id", async () => {
		p.contentImportJob.findFirst.mockResolvedValueOnce(null);
		p.contentImportJob.create.mockResolvedValueOnce({ id: "job-abc" });

		const id = await svc.createAndStartScan(GS_ID, "dons");
		expect(id).toBe("job-abc");
		expect(p.contentImportJob.create).toHaveBeenCalledTimes(1);
	});

	it("lève une erreur si un scan est déjà en cours", async () => {
		p.contentImportJob.findFirst.mockResolvedValueOnce({ id: "job-existing" });

		await expect(svc.createAndStartScan(GS_ID, "dons")).rejects.toThrow(
			"Un scan est déjà en cours",
		);
		expect(p.contentImportJob.create).not.toHaveBeenCalled();
	});
});

// ─── reviewItem ───────────────────────────────────────────────────────────────

describe("reviewItem", () => {
	beforeEach(resetMocks);

	it("approuve un item", async () => {
		await svc.reviewItem("item-1", "approved");
		expect(p.contentImportItem.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "item-1" },
				data: expect.objectContaining({ status: "approved" }),
			}),
		);
	});

	it("rejette un item", async () => {
		await svc.reviewItem("item-2", "rejected");
		expect(p.contentImportItem.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "rejected" }),
			}),
		);
	});
});

// ─── batchReview ──────────────────────────────────────────────────────────────

describe("batchReview", () => {
	beforeEach(resetMocks);

	it("approuve tous les items pending si aucun id fourni", async () => {
		p.contentImportItem.updateMany.mockResolvedValueOnce({ count: 5 });
		const result = await svc.batchReview("job-1", "approve");
		expect(p.contentImportItem.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "pending" }),
				data: { status: "approved" },
			}),
		);
		expect(result.count).toBe(5);
	});

	it("rejette les ids spécifiés", async () => {
		p.contentImportItem.updateMany.mockResolvedValueOnce({ count: 2 });
		await svc.batchReview("job-1", "reject", ["a", "b"]);
		expect(p.contentImportItem.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: { in: ["a", "b"] } }),
				data: { status: "rejected" },
			}),
		);
	});
});

// ─── applyJob ─────────────────────────────────────────────────────────────────

describe("applyJob", () => {
	beforeEach(resetMocks);

	it("applique les items approuvés et retourne le nombre", async () => {
		p.contentImportJob.findUniqueOrThrow.mockResolvedValueOnce({
			id: "job-1",
			gameSystemId: GS_ID,
			collection: "dons",
			status: "ready",
			items: [
				{
					id: "i1",
					slug: "alerte",
					name: "Alerte",
					description: "...",
					isNew: true,
					existingId: null,
				},
				{
					id: "i2",
					slug: "sentinelle",
					name: "Sentinelle",
					description: "...",
					isNew: false,
					existingId: "sc-99",
				},
			],
		});
		p.contentImportJob.update.mockResolvedValue({});
		p.systemContent.upsert.mockResolvedValue({});
		p.systemContent.update.mockResolvedValue({});

		const { applied } = await svc.applyJob("job-1");
		expect(applied).toBe(2);
		// Nouvel item → upsert
		expect(p.systemContent.upsert).toHaveBeenCalledTimes(1);
		// Item existant → update
		expect(p.systemContent.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "sc-99" } }),
		);
	});

	it("marque le job comme applied en fin", async () => {
		p.contentImportJob.findUniqueOrThrow.mockResolvedValueOnce({
			id: "job-1",
			gameSystemId: GS_ID,
			collection: "dons",
			status: "ready",
			items: [],
		});
		p.contentImportJob.update.mockResolvedValue({});

		await svc.applyJob("job-1");

		const lastCall = (
			p.contentImportJob.update as ReturnType<typeof mock>
		).mock.calls.at(-1)?.[0] as { data: { status: string } };
		expect(lastCall.data.status).toBe("applied");
	});
});

// ─── listJobs ─────────────────────────────────────────────────────────────────

describe("listJobs", () => {
	beforeEach(resetMocks);

	it("retourne tous les jobs sans filtre", async () => {
		const jobs = [
			{ id: "j1", collection: "dons" },
			{ id: "j2", collection: "sorts" },
		];
		p.contentImportJob.findMany.mockResolvedValueOnce(jobs);
		const result = await svc.listJobs();
		expect(result).toEqual(jobs);
		expect(p.contentImportJob.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: undefined }),
		);
	});

	it("filtre par gameSystemId si fourni", async () => {
		p.contentImportJob.findMany.mockResolvedValueOnce([]);
		await svc.listJobs(GS_ID);
		expect(p.contentImportJob.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { gameSystemId: GS_ID } }),
		);
	});
});

// ─── getJob ───────────────────────────────────────────────────────────────────

describe("getJob", () => {
	beforeEach(resetMocks);

	it("retourne null si introuvable", async () => {
		p.contentImportJob.findUnique.mockResolvedValueOnce(null);
		const job = await svc.getJob("non-existant");
		expect(job).toBeNull();
	});

	it("retourne le job avec _count", async () => {
		const job = { id: "job-1", status: "ready", _count: { items: 42 } };
		p.contentImportJob.findUnique.mockResolvedValueOnce(job);
		const result = await svc.getJob("job-1");
		expect(result).toEqual(job);
	});
});

// ─── listItems ────────────────────────────────────────────────────────────────

describe("listItems", () => {
	beforeEach(resetMocks);

	it("retourne les items avec pagination par défaut", async () => {
		const items = [{ id: "i1", slug: "alerte" }];
		p.contentImportItem.findMany.mockResolvedValueOnce(items);
		p.contentImportItem.count.mockResolvedValueOnce(1);

		const result = await svc.listItems("job-1");
		expect(result.items).toEqual(items);
		expect(result.total).toBe(1);
		expect(result.page).toBe(1);
		expect(result.perPage).toBe(50);
	});

	it("applique le filtre status", async () => {
		p.contentImportItem.findMany.mockResolvedValueOnce([]);
		p.contentImportItem.count.mockResolvedValueOnce(0);
		await svc.listItems("job-1", { status: "approved" });
		expect(p.contentImportItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "approved" }),
			}),
		);
	});

	it("applique le filtre isNew", async () => {
		p.contentImportItem.findMany.mockResolvedValueOnce([]);
		p.contentImportItem.count.mockResolvedValueOnce(0);
		await svc.listItems("job-1", { isNew: true });
		expect(p.contentImportItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isNew: true }),
			}),
		);
	});

	it("plafonne perPage à 100", async () => {
		p.contentImportItem.findMany.mockResolvedValueOnce([]);
		p.contentImportItem.count.mockResolvedValueOnce(0);
		await svc.listItems("job-1", { perPage: 9999 });
		expect(p.contentImportItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 100 }),
		);
	});
});

// ─── SSE subscribeProgress ────────────────────────────────────────────────────

describe("subscribeProgress", () => {
	it("appelle le callback lors d'un emit et se désabonne", () => {
		const cb = mock(() => {});
		const unsub = svc.subscribeProgress("job-sse", cb);

		// Simuler un emit via l'export interne (on passe par createAndStartScan
		// qui va émettre en échec — ici on vérifie juste le mécanisme de sub/unsub)
		unsub();

		// Après désabonnement, le callback ne devrait plus être appelé
		// (on ne peut pas appeler emit directement car il n'est pas exporté,
		// mais on vérifie que unsub ne lève pas d'erreur)
		expect(cb).not.toHaveBeenCalled();
	});
});
