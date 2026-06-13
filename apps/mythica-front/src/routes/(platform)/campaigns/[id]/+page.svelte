<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check-big";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import LinkIcon from "@lucide/svelte/icons/link";
	import LockIcon from "@lucide/svelte/icons/lock";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import PlayIcon from "@lucide/svelte/icons/play";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import UsersIcon from "@lucide/svelte/icons/users";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Empty from "$lib/components/ui/empty";
	import { Input } from "$lib/components/ui/input";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, campaignService } from "$lib/index.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const campaignId = page.params.id ?? "";

	type CampaignDetail = NonNullable<
		Awaited<ReturnType<typeof campaignService.getCampaignById>>
	>;
	type Session = NonNullable<
		Awaited<ReturnType<typeof campaignService.getSessions>>
	>["items"][number];

	let campaign = $state<CampaignDetail["campaign"] | null>(null);
	let members = $state<CampaignDetail["members"]>([]);
	let sessions = $state<Session[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let newSessionName = $state("");
	let newSessionDate = $state("");
	let busy = $state(false);
	let inviteLink = $state<string | null>(null);
	let inviteCopied = $state(false);

	const myMembership = $derived(
		members.find((m) => m.userId === data.user?.id) ?? null
	);
	const isOwner = $derived(campaign?.ownerId === data.user?.id);
	const isGm = $derived(isOwner || myMembership?.role === "gm");
	const isMember = $derived(!!myMembership || isOwner);

	// Sessions regroupées par état pour la vue MJ.
	const activeSessions = $derived(
		sessions.filter((s) => s.status === "active" || s.status === "paused")
	);
	const upcomingSessions = $derived(
		sessions.filter((s) => s.status === "scheduled")
	);
	const pastSessions = $derived(sessions.filter((s) => s.status === "ended"));

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

	function formatDate(date: string | number | Record<string, never>) {
		return new Intl.DateTimeFormat("fr-FR", {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(new Date(date as string | number));
	}

	function formatDateTime(
		date: string | number | Record<string, never> | null | undefined
	) {
		if (!date) return null;
		return new Intl.DateTimeFormat("fr-FR", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(date as string | number));
	}

	function sessionStatusLabel(status: string) {
		switch (status) {
			case "scheduled":
				return "Planifiee";
			case "active":
				return "En cours";
			case "paused":
				return "En pause";
			case "ended":
				return "Terminee";
			default:
				return status;
		}
	}

	function roleLabel(role: string) {
		switch (role) {
			case "gm":
				return "MJ";
			case "player":
				return "Joueur";
			case "spectator":
				return "Spectateur";
			default:
				return role;
		}
	}

	async function loadCampaign() {
		isLoading = true;
		error = null;
		try {
			const response = await campaignService.getCampaignById(campaignId);
			campaign = response?.campaign ?? null;
			members = response?.members ?? [];
			// Les sessions ne sont accessibles qu'aux membres.
			if (campaign && (response?.members ?? []).length >= 0) {
				try {
					const s = await campaignService.getSessions(campaignId);
					sessions = s?.items ?? [];
				} catch {
					sessions = [];
				}
			}
		} catch (err) {
			if (err instanceof ApiError && err.statusCode === 404) {
				error = "Cette campagne n'existe pas ou a ete supprimee.";
			} else if (err instanceof ApiError && err.statusCode === 403) {
				error = "Cette campagne est privee.";
			} else {
				error = "Impossible de charger la campagne.";
			}
		} finally {
			isLoading = false;
		}
	}

	async function join() {
		busy = true;
		actionError = null;
		try {
			await campaignService.join(campaignId);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible de rejoindre.";
		} finally {
			busy = false;
		}
	}

	async function leave() {
		busy = true;
		actionError = null;
		try {
			await campaignService.leave(campaignId);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible de quitter.";
		} finally {
			busy = false;
		}
	}

	async function removeCampaign() {
		if (!confirm("Supprimer definitivement cette campagne ?")) return;
		busy = true;
		actionError = null;
		try {
			await campaignService.deleteCampaign(campaignId);
			await goto("/campaigns/me");
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible de supprimer.";
			busy = false;
		}
	}

	async function createSession() {
		if (newSessionName.trim().length < 1) return;
		busy = true;
		actionError = null;
		try {
			await campaignService.createSession(campaignId, {
				nom: newSessionName.trim(),
				scheduledAt: newSessionDate
					? new Date(newSessionDate).toISOString()
					: undefined,
			});
			newSessionName = "";
			newSessionDate = "";
			await reloadSessions();
		} catch (err) {
			actionError =
				err instanceof ApiError
					? err.message
					: "Impossible de creer la session.";
		} finally {
			busy = false;
		}
	}

	async function reloadSessions() {
		const s = await campaignService.getSessions(campaignId);
		sessions = s?.items ?? [];
	}

	async function setSessionStatus(
		sessionId: string,
		status: "active" | "ended"
	) {
		busy = true;
		actionError = null;
		try {
			await campaignService.updateSession(campaignId, sessionId, { status });
			await reloadSessions();
		} catch (err) {
			actionError =
				err instanceof ApiError
					? err.message
					: "Impossible de mettre a jour la session.";
		} finally {
			busy = false;
		}
	}

	async function removeSession(sessionId: string) {
		busy = true;
		actionError = null;
		try {
			await campaignService.deleteSession(campaignId, sessionId);
			sessions = sessions.filter((s) => s.id !== sessionId);
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible de supprimer.";
		} finally {
			busy = false;
		}
	}

	async function generateInvite() {
		busy = true;
		actionError = null;
		inviteCopied = false;
		try {
			const response = await campaignService.createInvite(campaignId);
			if (response?.token) {
				inviteLink = `${window.location.origin}/join/${response.token}`;
			}
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible de creer le lien.";
		} finally {
			busy = false;
		}
	}

	async function copyInvite() {
		if (!inviteLink) return;
		await navigator.clipboard.writeText(inviteLink);
		inviteCopied = true;
		setTimeout(() => (inviteCopied = false), 2000);
	}

	onMount(loadCampaign);
</script>

<div class="mx-auto max-w-4xl px-6 py-8">
	<Button
		variant="ghost"
		href="/campaigns"
		class="mb-6 -ml-2 text-slate-600 hover:text-red-600 dark:text-muted-foreground"
	>
		<ArrowLeftIcon class="h-4 w-4" />
		Retour aux campagnes
	</Button>

	{#if isLoading}
		<Skeleton class="h-40 w-full rounded-xl" />
	{:else if error}
		<Empty.Root class="py-20">
			<Empty.Header>
				<Empty.Title>Une erreur est survenue</Empty.Title>
				<Empty.Description>{error}</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/campaigns" variant="outline">Retour aux campagnes</Button
				>
			</Empty.Content>
		</Empty.Root>
	{:else if campaign}
		<!-- Couverture -->
		{#if campaign.coverUrl}
			<div
				class="mb-6 aspect-[3/1] w-full overflow-hidden rounded-2xl border border-border"
			>
				<img
					src={campaign.coverUrl}
					alt={campaign.nom}
					class="h-full w-full object-cover"
				/>
			</div>
		{/if}
		<!-- En-tete -->
		<div class="mb-6 flex items-start justify-between gap-4">
			<div>
				<div class="mb-2 flex items-center gap-2">
					<Badge variant="secondary">{statusLabel(campaign.status)}</Badge>
					{#if campaign.isPublic}
						<Badge variant="outline"
							><GlobeIcon class="mr-1 h-3 w-3" />Publique</Badge
						>
					{:else}
						<Badge variant="outline"
							><LockIcon class="mr-1 h-3 w-3" />Privee</Badge
						>
					{/if}
				</div>
				<h1
					class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
				>
					{campaign.nom}
				</h1>
				<p
					class="mt-1 flex items-center gap-3 text-sm text-slate-500 dark:text-muted-foreground"
				>
					<span class="flex items-center gap-1">
						<CalendarIcon class="h-3.5 w-3.5" />
						{formatDate(campaign.createdAt)}
					</span>
					<span class="flex items-center gap-1">
						<UsersIcon class="h-3.5 w-3.5" />
						{members.length} membre{members.length > 1 ? "s" : ""}
					</span>
				</p>
			</div>
			<div class="flex shrink-0 gap-2">
				{#if isGm}
					<Button onclick={generateInvite} disabled={busy} variant="outline">
						<LinkIcon class="h-4 w-4" />Inviter
					</Button>
				{/if}
				{#if data.user && !isMember && campaign.isPublic}
					<Button
						onclick={join}
						disabled={busy}
						class="bg-red-600 text-white hover:bg-red-700"
					>
						<PlusIcon class="h-4 w-4" />Rejoindre
					</Button>
				{/if}
				{#if isMember && !isOwner}
					<Button onclick={leave} disabled={busy} variant="outline">
						<LogOutIcon class="h-4 w-4" />Quitter
					</Button>
				{/if}
				{#if isOwner}
					<Button
						onclick={removeCampaign}
						disabled={busy}
						variant="outline"
						class="text-red-500 hover:text-red-600"
					>
						<Trash2Icon class="h-4 w-4" />Supprimer
					</Button>
				{/if}
			</div>
		</div>

		{#if actionError}
			<p class="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
				{actionError}
			</p>
		{/if}

		{#if inviteLink}
			<div
				class="mb-6 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/30"
			>
				<p class="mb-2 text-sm font-medium text-slate-700 dark:text-red-300">
					Lien d'invitation (valable 7 jours)
				</p>
				<div class="flex gap-2">
					<Input value={inviteLink} readonly class="font-mono text-xs" />
					<Button onclick={copyInvite} variant="outline" class="shrink-0">
						{inviteCopied ? "Copie !" : "Copier"}
					</Button>
				</div>
			</div>
		{/if}

		<!-- Description -->
		<Card.Root class="mb-6">
			<Card.Header><Card.Title>Description</Card.Title></Card.Header>
			<Card.Content>
				<p class="text-sm text-slate-600 dark:text-muted-foreground">
					{campaign.description || "Aucune description."}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Membres -->
		<Card.Root class="mb-6">
			<Card.Header
				><Card.Title>Membres ({members.length})</Card.Title></Card.Header
			>
			<Card.Content class="space-y-2">
				{#each members as member (member.id)}
					<div
						class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-border/40"
					>
						<span
							class="font-mono text-xs text-slate-500 dark:text-muted-foreground"
						>
							{member.userId === data.user?.id
								? "Vous"
								: member.userId.slice(0, 8)}
						</span>
						<Badge variant="secondary">{roleLabel(member.role)}</Badge>
					</div>
				{:else}
					<p class="text-sm text-slate-400">Aucun membre.</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Sessions -->
		{#if isMember}
			{#snippet sessionRow(
				session: Session,
				kind: "active" | "upcoming" | "past"
			)}
				<div
					class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 {kind ===
					'active'
						? 'border-primary/40 bg-primary/5'
						: 'border-slate-100 dark:border-border/40'}"
				>
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<span class="truncate font-medium text-slate-900 dark:text-white"
								>{session.nom}</span
							>
							<Badge
								variant={kind === "active" ? "default" : "secondary"}
								class="shrink-0 text-xs"
							>
								{sessionStatusLabel(session.status)}
							</Badge>
						</div>
						{#if formatDateTime(session.scheduledAt ?? session.endedAt ?? session.startedAt)}
							<span
								class="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-muted-foreground"
							>
								<ClockIcon class="h-3 w-3" />
								{formatDateTime(
									session.scheduledAt ?? session.endedAt ?? session.startedAt
								)}
							</span>
						{/if}
					</div>
					{#if isGm}
						<div class="flex shrink-0 items-center gap-1.5">
							{#if kind === "upcoming"}
								<Button
									size="sm"
									onclick={() => setSessionStatus(session.id, "active")}
									disabled={busy}
									class="bg-primary text-primary-foreground hover:bg-primary/90"
								>
									<PlayIcon class="h-3.5 w-3.5" />Lancer
								</Button>
							{:else if kind === "active"}
								<Button
									size="sm"
									variant="outline"
									onclick={() => setSessionStatus(session.id, "ended")}
									disabled={busy}
								>
									<CircleCheckIcon class="h-3.5 w-3.5" />Terminer
								</Button>
							{/if}
							<button
								type="button"
								onclick={() => removeSession(session.id)}
								class="rounded p-1.5 text-slate-400 hover:text-red-500"
								title="Supprimer la session"
								aria-label="Supprimer la session"
							>
								<Trash2Icon class="h-4 w-4" />
							</button>
						</div>
					{/if}
				</div>
			{/snippet}

			<Card.Root>
				<Card.Header>
					<Card.Title>Sessions</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-5">
					{#if isGm}
						<div class="flex flex-col gap-2 sm:flex-row">
							<Input
								placeholder="Nom de la session..."
								bind:value={newSessionName}
								disabled={busy}
								class="sm:flex-1"
							/>
							<Input
								type="datetime-local"
								bind:value={newSessionDate}
								disabled={busy}
								class="sm:w-52"
							/>
							<Button
								onclick={createSession}
								disabled={busy || !newSessionName.trim()}
								class="bg-red-600 text-white hover:bg-red-700"
							>
								<PlusIcon class="h-4 w-4" />Planifier
							</Button>
						</div>
					{/if}

					{#if sessions.length === 0}
						<p class="text-sm text-slate-400">Aucune session pour le moment.</p>
					{/if}

					{#if activeSessions.length > 0}
						<div class="space-y-2">
							<h3
								class="text-xs font-semibold uppercase tracking-wide text-primary"
							>
								En cours
							</h3>
							{#each activeSessions as session (session.id)}
								{@render sessionRow(session, "active")}
							{/each}
						</div>
					{/if}

					{#if upcomingSessions.length > 0}
						<div class="space-y-2">
							<h3
								class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground"
							>
								A venir ({upcomingSessions.length})
							</h3>
							{#each upcomingSessions as session (session.id)}
								{@render sessionRow(session, "upcoming")}
							{/each}
						</div>
					{/if}

					{#if pastSessions.length > 0}
						<div class="space-y-2">
							<h3
								class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-muted-foreground/70"
							>
								Passees ({pastSessions.length})
							</h3>
							{#each pastSessions as session (session.id)}
								{@render sessionRow(session, "past")}
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
