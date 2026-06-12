<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import LinkIcon from "@lucide/svelte/icons/link";
	import LockIcon from "@lucide/svelte/icons/lock";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
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
	let busy = $state(false);
	let inviteLink = $state<string | null>(null);
	let inviteCopied = $state(false);

	const myMembership = $derived(
		members.find((m) => m.userId === data.user?.id) ?? null
	);
	const isOwner = $derived(campaign?.ownerId === data.user?.id);
	const isGm = $derived(isOwner || myMembership?.role === "gm");
	const isMember = $derived(!!myMembership || isOwner);

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
			});
			newSessionName = "";
			const s = await campaignService.getSessions(campaignId);
			sessions = s?.items ?? [];
		} catch (err) {
			actionError =
				err instanceof ApiError
					? err.message
					: "Impossible de creer la session.";
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
		class="mb-6 -ml-2 text-slate-600 hover:text-orange-600 dark:text-muted-foreground"
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
						class="bg-orange-600 text-white hover:bg-orange-700"
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
						class="text-rose-500 hover:text-rose-600"
					>
						<Trash2Icon class="h-4 w-4" />Supprimer
					</Button>
				{/if}
			</div>
		</div>

		{#if actionError}
			<p class="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
				{actionError}
			</p>
		{/if}

		{#if inviteLink}
			<div
				class="mb-6 rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/30"
			>
				<p class="mb-2 text-sm font-medium text-slate-700 dark:text-orange-300">
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
						class="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 dark:border-border/40"
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
			<Card.Root>
				<Card.Header
					><Card.Title>Sessions ({sessions.length})</Card.Title></Card.Header
				>
				<Card.Content class="space-y-3">
					{#if isGm}
						<div class="flex gap-2">
							<Input
								placeholder="Nom de la nouvelle session..."
								bind:value={newSessionName}
								disabled={busy}
							/>
							<Button
								onclick={createSession}
								disabled={busy || !newSessionName.trim()}
								class="bg-orange-600 text-white hover:bg-orange-700"
							>
								<PlusIcon class="h-4 w-4" />Creer
							</Button>
						</div>
					{/if}
					{#each sessions as session (session.id)}
						<div
							class="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 dark:border-border/40"
						>
							<div class="flex items-center gap-2">
								<span class="font-medium text-slate-900 dark:text-white"
									>{session.nom}</span
								>
								<Badge variant="outline">{session.status}</Badge>
							</div>
							{#if isGm}
								<button
									type="button"
									onclick={() => removeSession(session.id)}
									class="rounded p-1 text-stone-400 hover:text-rose-500"
									title="Supprimer la session"
								>
									<Trash2Icon class="h-4 w-4" />
								</button>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-slate-400">Aucune session planifiee.</p>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
