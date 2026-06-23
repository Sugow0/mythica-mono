<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import PlayIcon from "@lucide/svelte/icons/play";
	import XIcon from "@lucide/svelte/icons/x";
	import { onMount } from "svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import {
		AIDEDD_COLLECTIONS,
		COLLECTION_LABELS,
		type AideddCollection,
		type ContentImportJob,
		type ScanProgress,
		contentImportService,
	} from "$lib/api/services/content-import-service";

	// ── State ──────────────────────────────────────────────────────────────────
	let jobs = $state<ContentImportJob[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Formulaire de scan
	let selectedCollection = $state<AideddCollection>("dons");
	let gameSystemId = $state("");
	let launching = $state(false);
	let launchError = $state<string | null>(null);

	// Progression SSE du job en cours (si scanning)
	let activeProgress = $state<ScanProgress | null>(null);
	let stopStream: (() => void) | null = null;

	// ── Chargement ─────────────────────────────────────────────────────────────
	async function load() {
		try {
			loading = true;
			error = null;
			jobs = await contentImportService.listJobs(gameSystemId || undefined);
		} catch (e) {
			error = e instanceof Error ? e.message : "Erreur chargement";
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
		return () => stopStream?.();
	});

	// ── Lancement d'un scan ────────────────────────────────────────────────────
	async function startScan() {
		if (!gameSystemId || !selectedCollection) return;
		launchError = null;
		launching = true;
		try {
			const { jobId } = await contentImportService.startScan(
				gameSystemId,
				selectedCollection,
			);
			await load();
			// Ouvrir le SSE pour le job qui vient de démarrer
			openStream(jobId);
		} catch (e) {
			launchError = e instanceof Error ? e.message : "Erreur lancement";
		} finally {
			launching = false;
		}
	}

	function openStream(jobId: string) {
		stopStream?.();
		activeProgress = {
			jobId,
			status: "scanning",
			totalFound: 0,
			totalFetched: 0,
			totalNew: 0,
			totalUpdated: 0,
		};
		stopStream = contentImportService.streamProgress(jobId, async (p) => {
			activeProgress = p;
			if (p.status === "ready" || p.status === "failed") {
				stopStream = null;
				await load();
			}
		});
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	const STATUS_LABELS: Record<string, string> = {
		scanning: "Scan en cours",
		ready: "Prêt à review",
		applying: "Application…",
		applied: "Appliqué",
		failed: "Échec",
	};

	const STATUS_VARIANT: Record<
		string,
		"default" | "secondary" | "destructive" | "outline"
	> = {
		scanning: "secondary",
		ready: "default",
		applying: "secondary",
		applied: "outline",
		failed: "destructive",
	};

	function fmtDate(s: string | null) {
		if (!s) return "—";
		return new Date(s).toLocaleString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	}
</script>

<div class="p-8">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white">Import de contenu</h1>
		<p class="mt-1 text-sm text-slate-400">
			Scan aidedd.org → staging → review → import en prod
		</p>
	</div>

	<!-- Formulaire de scan -->
	<Card.Root class="mb-8 border-slate-700 bg-slate-900">
		<Card.Header>
			<Card.Title class="text-white">Nouveau scan</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-wrap items-end gap-4">
			<!-- Game System ID -->
			<div class="flex flex-col gap-1.5">
				<label class="text-sm text-slate-400" for="gs-id">Game System ID</label>
				<input
					id="gs-id"
					type="text"
					placeholder="UUID du système de jeu"
					bind:value={gameSystemId}
					class="h-9 w-72 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500"
				/>
			</div>

			<!-- Collection -->
			<div class="flex flex-col gap-1.5">
				<label class="text-sm text-slate-400" for="collection">Collection</label>
				<select
					id="collection"
					bind:value={selectedCollection}
					class="h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus:border-red-500"
				>
					{#each AIDEDD_COLLECTIONS as col (col)}
						<option value={col}>{COLLECTION_LABELS[col]}</option>
					{/each}
				</select>
			</div>

			<Button
				onclick={startScan}
				disabled={launching || !gameSystemId}
				class="bg-red-600 hover:bg-red-700"
			>
				{#if launching}
					<LoaderIcon class="h-4 w-4 animate-spin" />
				{:else}
					<PlayIcon class="h-4 w-4" />
				{/if}
				Scanner
			</Button>

			{#if launchError}
				<p class="text-sm text-red-400">{launchError}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Progression SSE -->
	{#if activeProgress && activeProgress.status === "scanning"}
		<Card.Root class="mb-6 border-slate-700 bg-slate-900">
			<Card.Content class="pt-4">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-sm font-medium text-white">
						Scan en cours…
					</span>
					<span class="text-xs text-slate-400">
						{activeProgress.totalFetched} / {activeProgress.totalFound || "?"}
					</span>
				</div>
				<!-- Barre de progression -->
				<div class="h-2 w-full overflow-hidden rounded-full bg-slate-700">
					<div
						class="h-full bg-red-600 transition-all"
						style="width: {activeProgress.totalFound
							? Math.round(
									(activeProgress.totalFetched / activeProgress.totalFound) * 100,
								)
							: 0}%"
					></div>
				</div>
				{#if activeProgress.currentSlug}
					<p class="mt-2 truncate text-xs text-slate-500">
						{activeProgress.currentSlug}
					</p>
				{/if}
				<div class="mt-3 flex gap-4 text-xs text-slate-400">
					<span class="text-green-400">+{activeProgress.totalNew} nouveaux</span>
					<span class="text-amber-400">~{activeProgress.totalUpdated} mis à jour</span>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Liste des jobs -->
	{#if error}
		<p class="text-sm text-red-400">{error}</p>
	{:else if loading}
		<div class="flex items-center gap-2 text-slate-400">
			<LoaderIcon class="h-4 w-4 animate-spin" />
			Chargement…
		</div>
	{:else if jobs.length === 0}
		<p class="text-sm text-slate-500">Aucun job. Lancez un scan ci-dessus.</p>
	{:else}
		<div class="overflow-hidden rounded-xl border border-slate-700">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-700 bg-slate-900/60">
					<tr>
						<th class="px-4 py-3 text-left font-medium text-slate-400"
							>Collection</th
						>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Statut</th>
						<th class="px-4 py-3 text-right font-medium text-slate-400"
							>Trouvés</th
						>
						<th class="px-4 py-3 text-right font-medium text-slate-400"
							>Nouveaux</th
						>
						<th class="px-4 py-3 text-right font-medium text-slate-400"
							>Modifiés</th
						>
						<th class="px-4 py-3 text-left font-medium text-slate-400">Créé</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800 bg-slate-950">
					{#each jobs as job (job.id)}
						<tr class="group hover:bg-slate-900/40">
							<td class="px-4 py-3 font-medium text-white">
								{COLLECTION_LABELS[job.collection as AideddCollection] ??
									job.collection}
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									{#if job.status === "scanning"}
										<LoaderIcon class="h-3 w-3 animate-spin text-slate-400" />
									{:else if job.status === "applied"}
										<CheckIcon class="h-3 w-3 text-green-400" />
									{:else if job.status === "failed"}
										<XIcon class="h-3 w-3 text-red-400" />
									{/if}
									<Badge variant={STATUS_VARIANT[job.status]}>
										{STATUS_LABELS[job.status] ?? job.status}
									</Badge>
								</div>
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-slate-300">
								{job.totalFound}
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-green-400">
								{job.totalNew}
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-amber-400">
								{job.totalUpdated}
							</td>
							<td class="px-4 py-3 text-slate-400">{fmtDate(job.createdAt)}</td>
							<td class="px-4 py-3 text-right">
								{#if job.status === "ready" || job.status === "applied"}
									<a
										href="/admin/content-imports/{job.id}"
										class="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
									>
										Reviewer <ChevronRightIcon class="h-3 w-3" />
									</a>
								{:else if job.status === "scanning"}
									<button
										type="button"
										class="text-xs text-slate-500"
										onclick={() => openStream(job.id)}
									>
										Suivre
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
