<script lang="ts">
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SearchIcon from "@lucide/svelte/icons/search";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import { onMount } from "svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Empty from "$lib/components/ui/empty";
	import { Input } from "$lib/components/ui/input";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, campaignService } from "$lib/index.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	type Campaign = NonNullable<
		Awaited<ReturnType<typeof campaignService.getCampaigns>>
	>["items"][number];

	// State
	let campaigns = $state<Campaign[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state("");
	let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
	let pagination = $state({ page: 1, limit: 12, total: 0, totalPages: 0 });

	// Load campaigns
	async function loadCampaigns(page = 1) {
		isLoading = true;
		error = null;
		try {
			const response = await campaignService.getCampaigns({
				page,
				limit: pagination.limit,
			});
			campaigns = response?.items ?? [];
			if (response) {
				const total = Number(response.total);
				pagination = {
					...pagination,
					total,
					page,
					totalPages: Math.ceil(total / pagination.limit),
				};
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = "Impossible de charger les campagnes.";
			}
		} finally {
			isLoading = false;
		}
	}

	// Search campaigns
	async function searchCampaigns() {
		if (!searchQuery.trim()) {
			loadCampaigns(1);
			return;
		}
		isLoading = true;
		error = null;
		try {
			const response = await campaignService.searchCampaigns(searchQuery, {
				page: 1,
				limit: pagination.limit,
			});
			campaigns = response?.items ?? [];
			if (response) {
				const total = Number(response.total);
				pagination = {
					...pagination,
					total,
					page: 1,
					totalPages: Math.ceil(total / pagination.limit),
				};
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = "Erreur lors de la recherche.";
			}
		} finally {
			isLoading = false;
		}
	}

	function handleSearchInput() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			searchCampaigns();
		}, 400);
	}

	// Format date
	function formatDate(date: string | number | Record<string, never>) {
		return new Intl.DateTimeFormat("fr-FR", {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(new Date(date as string | number));
	}

	// Status label
	function statusLabel(status: string) {
		switch (status) {
			case "active":
				return "Active";
			case "paused":
				return "En pause";
			case "archived":
				return "Archivee";
			default:
				return status;
		}
	}

	function statusVariant(status: string): "default" | "secondary" | "outline" {
		switch (status) {
			case "active":
				return "default";
			case "paused":
				return "secondary";
			default:
				return "outline";
		}
	}

	// Load on mount
	onMount(() => {
		loadCampaigns();
	});
</script>

<!-- Content -->
<div class="mx-auto max-w-6xl px-6 py-8">
	<!-- Header -->
	<div class="mb-10">
		<div
			class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
		>
			<div>
				<div
					class="mb-3 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
				>
					<GlobeIcon class="h-4 w-4" />
					Campagnes publiques
				</div>
				<h1
					class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
				>
					Explorez les campagnes
				</h1>
				<p class="mt-2 text-lg text-slate-600 dark:text-muted-foreground">
					Decouvrez et rejoignez des aventures creees par la communaute.
				</p>
			</div>

			{#if data.user}
				<Button
					href="/campaigns/new"
					class="group bg-red-600 text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 hover:scale-105 hover:shadow-lg"
				>
					<PlusIcon class="h-4 w-4" />
					Creer une campagne
				</Button>
			{/if}
		</div>

		<!-- Search bar -->
		<div class="mt-8 relative max-w-md">
			<SearchIcon
				class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
			/>
			<Input
				type="text"
				placeholder="Rechercher une campagne..."
				bind:value={searchQuery}
				oninput={handleSearchInput}
				class="pl-10"
			/>
		</div>
	</div>

	<!-- Loading state -->
	{#if isLoading}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<Card.Root class="overflow-hidden">
					<div class="h-40 w-full">
						<Skeleton class="h-full w-full rounded-none" />
					</div>
					<Card.Header>
						<Skeleton class="h-5 w-3/4" />
						<Skeleton class="mt-2 h-4 w-1/2" />
					</Card.Header>
					<Card.Content>
						<Skeleton class="h-4 w-full" />
						<Skeleton class="mt-2 h-4 w-2/3" />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Error state -->
	{:else if error}
		<div class="flex flex-col items-center justify-center py-20">
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950"
			>
				<svg
					class="h-8 w-8 text-red-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-slate-900 dark:text-white">
				Une erreur est survenue
			</h3>
			<p class="mt-1 text-slate-600 dark:text-muted-foreground">{error}</p>
			<Button variant="outline" class="mt-4" onclick={() => loadCampaigns()}>
				Reessayer
			</Button>
		</div>

		<!-- Empty state -->
	{:else if campaigns.length === 0}
		<Empty.Root class="py-20">
			<Empty.Header>
				<Empty.Media variant="icon">
					<SwordsIcon class="h-6 w-6 text-red-600 dark:text-red-400" />
				</Empty.Media>
				<Empty.Title>
					{searchQuery ? "Aucun resultat" : "Aucune campagne disponible"}
				</Empty.Title>
				<Empty.Description>
					{#if searchQuery}
						Aucune campagne ne correspond a votre recherche.
					{:else}
						Soyez le premier a creer une campagne publique !
					{/if}
				</Empty.Description>
			</Empty.Header>
			{#if data.user}
				<Empty.Content>
					<Button
						href="/campaigns/new"
						class="bg-red-600 text-white hover:bg-red-700"
					>
						<PlusIcon class="h-4 w-4" />
						Creer une campagne
					</Button>
				</Empty.Content>
			{/if}
		</Empty.Root>

		<!-- Campaign grid -->
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each campaigns as campaign (campaign.id)}
				<Card.Root
					class="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/5 dark:hover:shadow-red-500/10"
				>
					<!-- Campaign image / placeholder -->
					<div
						class="relative h-40 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/60 dark:to-slate-900/60"
					>
						{#if campaign.coverUrl}
							<img
								src={campaign.coverUrl}
								alt={campaign.nom}
								class="h-full w-full object-cover"
							/>
						{:else}
							<div class="flex h-full w-full items-center justify-center">
								<SwordsIcon
									class="h-12 w-12 text-slate-400/50 dark:text-slate-500/40"
								/>
							</div>
						{/if}
						<!-- Status badge -->
						<div class="absolute top-3 right-3">
							<Badge variant={statusVariant(campaign.status)} class="text-xs">
								{statusLabel(campaign.status)}
							</Badge>
						</div>
					</div>

					<Card.Header class="pb-2">
						<Card.Title
							class="text-lg font-bold text-slate-900 dark:text-white line-clamp-1"
						>
							{campaign.nom}
						</Card.Title>
					</Card.Header>

					<Card.Content class="pb-2">
						{#if campaign.description}
							<p
								class="text-sm text-slate-600 dark:text-muted-foreground line-clamp-2"
							>
								{campaign.description}
							</p>
						{:else}
							<p
								class="text-sm italic text-slate-400 dark:text-muted-foreground/60"
							>
								Aucune description
							</p>
						{/if}
						{#if campaign.tags && campaign.tags.length > 0}
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each campaign.tags.slice(0, 3) as tag (tag)}
									<Badge variant="secondary" class="text-xs">{tag}</Badge>
								{/each}
								{#if campaign.tags.length > 3}
									<Badge variant="outline" class="text-xs"
										>+{campaign.tags.length - 3}</Badge
									>
								{/if}
							</div>
						{/if}
					</Card.Content>

					<Card.Footer
						class="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-border/40"
					>
						<div
							class="flex items-center gap-4 text-xs text-slate-500 dark:text-muted-foreground"
						>
							<span class="flex items-center gap-1">
								<CalendarIcon class="h-3.5 w-3.5" />
								{formatDate(campaign.createdAt)}
							</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							href="/campaigns/{campaign.id}"
							class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
						>
							Voir
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		<!-- Pagination -->
		{#if pagination.totalPages > 1}
			<div class="mt-10 flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={pagination.page <= 1}
					onclick={() => loadCampaigns(pagination.page - 1)}
				>
					Precedent
				</Button>
				<span class="px-4 text-sm text-slate-600 dark:text-muted-foreground">
					Page {pagination.page} sur {pagination.totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={pagination.page >= pagination.totalPages}
					onclick={() => loadCampaigns(pagination.page + 1)}
				>
					Suivant
				</Button>
			</div>
		{/if}
	{/if}
</div>
