<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CheckIcon from "@lucide/svelte/icons/check";
	import CheckCheckIcon from "@lucide/svelte/icons/check-check";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import XIcon from "@lucide/svelte/icons/x";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import {
		COLLECTION_LABELS,
		type AideddCollection,
		type ContentImportItem,
		type ContentImportJob,
		type ImportItemStatus,
		contentImportService,
	} from "$lib/api/services/content-import-service";

	// ── State ──────────────────────────────────────────────────────────────────
	const jobId = $derived(page.params.jobId ?? "");

	let job = $state<ContentImportJob | null>(null);
	let items = $state<ContentImportItem[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let filterStatus = $state<ImportItemStatus | "">("");
	let filterNew = $state<"" | "true" | "false">("");

	let applying = $state(false);
	let applyResult = $state<string | null>(null);

	// ── Chargement ─────────────────────────────────────────────────────────────
	async function load(p = 1) {
		loading = true;
		error = null;
		try {
			const [jobData, itemsData] = await Promise.all([
				contentImportService.getJob(jobId),
				contentImportService.listItems(jobId, {
					status: filterStatus || undefined,
					isNew: filterNew ? filterNew === "true" : undefined,
					page: p,
					perPage: 50,
				}),
			]);
			job = jobData;
			items = itemsData.items;
			total = itemsData.total;
			currentPage = itemsData.page;
		} catch (e) {
			error = e instanceof Error ? e.message : "Erreur";
		} finally {
			loading = false;
		}
	}

	onMount(() => load());

	// ── Review individuelle ────────────────────────────────────────────────────
	async function review(item: ContentImportItem, status: "approved" | "rejected") {
		await contentImportService.reviewItem(jobId, item.id, status);
		item.status = status;
	}

	// ── Batch review ──────────────────────────────────────────────────────────
	async function batchApproveAll() {
		await contentImportService.batchReview(jobId, "approve");
		await load(currentPage);
	}

	async function batchRejectAll() {
		await contentImportService.batchReview(jobId, "reject");
		await load(currentPage);
	}

	// ── Apply ─────────────────────────────────────────────────────────────────
	async function apply() {
		applying = true;
		applyResult = null;
		try {
			const { applied } = await contentImportService.applyJob(jobId);
			applyResult = `${applied} item(s) importé(s) en production.`;
			await load(currentPage);
		} catch (e) {
			applyResult = e instanceof Error ? e.message : "Erreur lors de l'application";
		} finally {
			applying = false;
		}
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	const pendingCount = $derived(items.filter((i) => i.status === "pending").length);
	const approvedCount = $derived(items.filter((i) => i.status === "approved").length);
	const rejectedCount = $derived(items.filter((i) => i.status === "rejected").length);
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<a
			href="/admin/content-imports"
			class="text-slate-400 hover:text-white"
			aria-label="Retour"
		>
			<ArrowLeftIcon class="h-5 w-5" />
		</a>
		<div>
			<h1 class="text-xl font-bold text-white">
				Review — {job
					? (COLLECTION_LABELS[job.collection as AideddCollection] ?? job.collection)
					: "…"}
			</h1>
			<p class="text-xs text-slate-500">{jobId}</p>
		</div>
		{#if job?.status === "ready"}
			<div class="ml-auto flex items-center gap-3">
				<!-- Compteurs -->
				<div class="flex gap-3 text-xs">
					<span class="text-slate-400">{total} items</span>
					<span class="text-amber-400">{pendingCount} en attente</span>
					<span class="text-green-400">{approvedCount} approuvés</span>
					<span class="text-red-400">{rejectedCount} rejetés</span>
				</div>
				<!-- Batch -->
				<Button variant="outline" size="sm" onclick={batchApproveAll}>
					<CheckCheckIcon class="h-4 w-4" /> Tout approuver
				</Button>
				<Button variant="outline" size="sm" onclick={batchRejectAll}>
					<XIcon class="h-4 w-4" /> Tout rejeter
				</Button>
				<!-- Apply -->
				<Button
					class="bg-red-600 hover:bg-red-700"
					size="sm"
					onclick={apply}
					disabled={applying || approvedCount === 0}
				>
					{#if applying}
						<LoaderIcon class="h-4 w-4 animate-spin" />
					{:else}
						<UploadIcon class="h-4 w-4" />
					{/if}
					Appliquer ({approvedCount})
				</Button>
			</div>
		{:else if job?.status === "applied"}
			<Badge variant="outline" class="ml-auto text-green-400">Appliqué</Badge>
		{/if}
	</div>

	<!-- Résultat apply -->
	{#if applyResult}
		<div class="mb-4 rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">
			{applyResult}
		</div>
	{/if}

	<!-- Filtres -->
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<select
			bind:value={filterStatus}
			onchange={() => load(1)}
			class="h-8 rounded-md border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none focus:border-red-500"
		>
			<option value="">Tous statuts</option>
			<option value="pending">En attente</option>
			<option value="approved">Approuvés</option>
			<option value="rejected">Rejetés</option>
		</select>
		<select
			bind:value={filterNew}
			onchange={() => load(1)}
			class="h-8 rounded-md border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none focus:border-red-500"
		>
			<option value="">Tous types</option>
			<option value="true">Nouveaux seulement</option>
			<option value="false">Mises à jour seulement</option>
		</select>
		<span class="text-xs text-slate-500">{total} résultat(s)</span>
	</div>

	<!-- Erreur / chargement -->
	{#if error}
		<p class="text-sm text-red-400">{error}</p>
	{:else if loading}
		<div class="flex items-center gap-2 text-slate-400">
			<LoaderIcon class="h-4 w-4 animate-spin" /> Chargement…
		</div>
	{:else}
		<!-- Table des items -->
		<div class="overflow-hidden rounded-xl border border-slate-700">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-700 bg-slate-900/60">
					<tr>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Slug</th>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Nom</th>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Type</th>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Aperçu</th>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Statut</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800 bg-slate-950">
					{#each items as item (item.id)}
						<tr class="group hover:bg-slate-900/30">
							<td class="px-4 py-3 font-mono text-xs text-slate-400">{item.slug}</td>
							<td class="px-4 py-3 font-medium text-white">{item.name ?? "—"}</td>
							<td class="px-4 py-3">
								{#if item.isNew}
									<Badge class="bg-green-900/50 text-green-400 border-green-800">Nouveau</Badge>
								{:else}
									<Badge variant="outline" class="text-amber-400 border-amber-800">Mise à jour</Badge>
								{/if}
							</td>
							<td class="max-w-xs px-4 py-3">
								{#if item.description}
									<p class="truncate text-xs text-slate-400" title={item.description}>
										{item.description.slice(0, 120)}{item.description.length > 120 ? "…" : ""}
									</p>
								{:else}
									<span class="text-xs text-slate-600">—</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if item.status === "approved"}
									<span class="flex items-center gap-1 text-xs text-green-400">
										<CheckIcon class="h-3 w-3" /> Approuvé
									</span>
								{:else if item.status === "rejected"}
									<span class="flex items-center gap-1 text-xs text-red-400">
										<XIcon class="h-3 w-3" /> Rejeté
									</span>
								{:else}
									<span class="text-xs text-slate-500">En attente</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if job?.status === "ready"}
									<div class="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
										{#if item.status !== "approved"}
											<button
												type="button"
												onclick={() => review(item, "approved")}
												class="rounded p-1 text-green-400 hover:bg-green-900/30"
												aria-label="Approuver"
											>
												<CheckIcon class="h-4 w-4" />
											</button>
										{/if}
										{#if item.status !== "rejected"}
											<button
												type="button"
												onclick={() => review(item, "rejected")}
												class="rounded p-1 text-red-400 hover:bg-red-900/30"
												aria-label="Rejeter"
											>
												<XIcon class="h-4 w-4" />
											</button>
										{/if}
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if total > 50}
			<div class="mt-4 flex items-center justify-center gap-3">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage <= 1}
					onclick={() => load(currentPage - 1)}
				>
					Précédent
				</Button>
				<span class="text-xs text-slate-400">
					Page {currentPage} / {Math.ceil(total / 50)}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage >= Math.ceil(total / 50)}
					onclick={() => load(currentPage + 1)}
				>
					Suivant
				</Button>
			</div>
		{/if}
	{/if}
</div>
