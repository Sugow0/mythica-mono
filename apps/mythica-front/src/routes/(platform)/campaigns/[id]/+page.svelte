<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check-big";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import DoorOpenIcon from "@lucide/svelte/icons/door-open";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import ImageIcon from "@lucide/svelte/icons/image";
	import LinkIcon from "@lucide/svelte/icons/link";
	import LockIcon from "@lucide/svelte/icons/lock";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import PlayIcon from "@lucide/svelte/icons/play";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SendIcon from "@lucide/svelte/icons/send";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import UsersIcon from "@lucide/svelte/icons/users";
	import { onDestroy, onMount, tick } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Empty from "$lib/components/ui/empty";
	import { Label } from "$lib/components/ui/label";
	import * as NativeSelect from "$lib/components/ui/native-select";
	import SessionCalendar from "$lib/components/session-calendar.svelte";
	import TagInput from "$lib/components/tag-input.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Textarea } from "$lib/components/ui/textarea";
	import { ApiError, campaignService } from "$lib/index.js";
	import CampaignCharactersTab from "$lib/components/campaign/CampaignCharactersTab.svelte";
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
	let sessionView = $state<"list" | "calendar">("list");
	let busy = $state(false);
	let inviteLink = $state<string | null>(null);
	let inviteCopied = $state(false);

	// Demandes d'accès
	type JoinRequest = NonNullable<
		Awaited<ReturnType<typeof campaignService.getJoinRequests>>
	>["items"][number];
	let myJoinRequestStatus = $state<string | null>(null);
	let pendingRequests = $state<JoinRequest[]>([]);

	// Chat temps réel (SSE)
	type ChatMessage = {
		id: string;
		userId: string;
		content: string;
		createdAt: string | number | Record<string, never>;
		user?: { pseudo: string | null };
	};
	let messages = $state<ChatMessage[]>([]);
	let chatInput = $state("");
	let chatBusy = $state(false);
	let messagesEl = $state<HTMLDivElement | null>(null);
	let eventSource: EventSource | null = null;

	// Édition des infos de campagne (propriétaire)
	let editOpen = $state(false);
	let editName = $state("");
	let editDescription = $state("");
	let editVisibility = $state<"PUBLIC" | "PRIVATE">("PRIVATE");
	let editStatus = $state<"active" | "paused" | "archived">("active");
	let editError = $state<string | null>(null);
	let editTags = $state<string[]>([]);
	const editValid = $derived(
		editName.trim().length >= 3 && editName.trim().length <= 255
	);

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
			myJoinRequestStatus = response?.myJoinRequestStatus ?? null;
			// Les sessions ne sont accessibles qu'aux membres.
			if (campaign && (response?.members ?? []).length >= 0) {
				try {
					const s = await campaignService.getSessions(campaignId);
					sessions = s?.items ?? [];
				} catch {
					sessions = [];
				}
			}
			// Le MJ voit les demandes d'accès en attente.
			if (isGm) {
				try {
					const reqs = await campaignService.getJoinRequests(campaignId);
					pendingRequests = reqs?.items ?? [];
				} catch {
					pendingRequests = [];
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

	async function requestAccess() {
		busy = true;
		actionError = null;
		try {
			await campaignService.requestJoin(campaignId);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError
					? err.message
					: "Impossible d'envoyer la demande.";
		} finally {
			busy = false;
		}
	}

	async function respondToRequest(requestId: string, accept: boolean) {
		busy = true;
		actionError = null;
		try {
			if (accept)
				await campaignService.acceptJoinRequest(campaignId, requestId);
			else await campaignService.declineJoinRequest(campaignId, requestId);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Action impossible.";
		} finally {
			busy = false;
		}
	}

	// Couverture (propriétaire)
	const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
	const MAX_COVER_SIZE = 10 * 1024 * 1024;
	let coverBusy = $state(false);

	async function onCoverSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		actionError = null;
		if (!ALLOWED_COVER_TYPES.includes(file.type)) {
			actionError = "Format non supporté. Utilisez JPEG, PNG ou WebP.";
			input.value = "";
			return;
		}
		if (file.size > MAX_COVER_SIZE) {
			actionError = "Image trop volumineuse (max. 10 Mo).";
			input.value = "";
			return;
		}
		coverBusy = true;
		try {
			await campaignService.uploadCoverImage(campaignId, file);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Échec de l'upload.";
		} finally {
			coverBusy = false;
			input.value = "";
		}
	}

	async function changeMemberRole(
		userId: string,
		role: "gm" | "player" | "spectator"
	) {
		busy = true;
		actionError = null;
		try {
			await campaignService.setMemberRole(campaignId, userId, role);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError
					? err.message
					: "Impossible de changer le rôle.";
		} finally {
			busy = false;
		}
	}

	async function kickMember(userId: string) {
		if (!confirm("Expulser ce membre de la campagne ?")) return;
		busy = true;
		actionError = null;
		try {
			await campaignService.kickMember(campaignId, userId);
			await loadCampaign();
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible d'expulser.";
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

	function openEdit() {
		if (!campaign) return;
		editName = campaign.nom;
		editDescription = campaign.description ?? "";
		editVisibility = campaign.isPublic ? "PUBLIC" : "PRIVATE";
		editStatus = campaign.status as "active" | "paused" | "archived";
		editTags = [...(campaign.tags ?? [])];
		editError = null;
		editOpen = true;
	}

	async function saveEdit() {
		if (!editValid) return;
		busy = true;
		editError = null;
		try {
			await campaignService.updateCampaign(campaignId, {
				nom: editName.trim(),
				description: editDescription.trim(),
				isPublic: editVisibility === "PUBLIC",
				status: editStatus,
				tags: editTags,
			});
			editOpen = false;
			await loadCampaign();
		} catch (err) {
			editError =
				err instanceof ApiError
					? err.message
					: "Impossible d'enregistrer les modifications.";
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

	async function scrollChatToBottom() {
		await tick();
		if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	function appendMessage(msg: ChatMessage) {
		if (messages.some((m) => m.id === msg.id)) return;
		messages = [...messages, msg];
		scrollChatToBottom();
	}

	async function loadMessages() {
		try {
			const res = await campaignService.getMessages(campaignId);
			messages = (res?.items ?? []) as ChatMessage[];
			scrollChatToBottom();
		} catch {
			// Le chat reste vide si l'historique est inaccessible.
		}
	}

	function connectChat() {
		eventSource?.close();
		eventSource = new EventSource(
			campaignService.messagesStreamUrl(campaignId),
			{ withCredentials: true }
		);
		eventSource.onmessage = (event) => {
			try {
				appendMessage(JSON.parse(event.data) as ChatMessage);
			} catch {
				// Ignore les trames non-JSON (heartbeats).
			}
		};
	}

	async function sendMessage() {
		const content = chatInput.trim();
		if (!content || chatBusy) return;
		chatBusy = true;
		try {
			await campaignService.postMessage(campaignId, content);
			chatInput = "";
		} catch (err) {
			actionError =
				err instanceof ApiError ? err.message : "Impossible d'envoyer.";
		} finally {
			chatBusy = false;
		}
	}

	function authorLabel(message: ChatMessage) {
		if (message.userId === data.user?.id) return "Vous";
		return message.user?.pseudo ?? message.userId.slice(0, 8);
	}

	onMount(async () => {
		await loadCampaign();
		if (isMember) {
			await loadMessages();
			connectChat();
		}
	});

	onDestroy(() => eventSource?.close());
</script>

<div class="mx-auto max-w-6xl px-6 py-8">
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
		<div class="grid gap-6 lg:grid-cols-3 lg:items-start">
			<!-- Colonne principale -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Couverture -->
				{#if campaign.coverUrl || isOwner}
					<div
						class="relative mb-6 aspect-[3/1] w-full overflow-hidden rounded-2xl border border-border {campaign.coverUrl
							? ''
							: 'bg-muted/30'}"
					>
						{#if campaign.coverUrl}
							<img
								src={campaign.coverUrl}
								alt={campaign.nom}
								class="h-full w-full object-cover"
							/>
						{:else}
							<div
								class="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
							>
								<ImageIcon class="h-7 w-7" />
								<span class="text-sm">Aucune couverture</span>
							</div>
						{/if}
						{#if isOwner}
							<label
								class="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/80 {coverBusy
									? 'pointer-events-none opacity-60'
									: ''}"
							>
								<ImageIcon class="mr-1 inline h-3.5 w-3.5" />
								{coverBusy
									? "Envoi…"
									: campaign.coverUrl
										? "Changer la couverture"
										: "Ajouter une couverture"}
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp"
									class="sr-only"
									disabled={coverBusy}
									onchange={onCoverSelected}
								/>
							</label>
						{/if}
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
						{#if campaign.tags && campaign.tags.length > 0}
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each campaign.tags as tag (tag)}
									<Badge variant="secondary" class="text-xs">{tag}</Badge>
								{/each}
							</div>
						{/if}
					</div>
					<div class="flex shrink-0 gap-2">
						{#if isGm}
							<Button
								onclick={generateInvite}
								disabled={busy}
								variant="outline"
							>
								<LinkIcon class="h-4 w-4" />Inviter
							</Button>
						{/if}
						{#if data.user && !isMember && campaign.isPublic}
							{#if myJoinRequestStatus === "pending"}
								<Button variant="outline" disabled>
									<ClockIcon class="h-4 w-4" />Demande envoyée
								</Button>
							{:else}
								<Button
									onclick={requestAccess}
									disabled={busy}
									class="bg-red-600 text-white hover:bg-red-700"
								>
									<PlusIcon class="h-4 w-4" />Demander l'accès
								</Button>
							{/if}
						{/if}
						{#if isMember && !isOwner}
							<Button onclick={leave} disabled={busy} variant="outline">
								<LogOutIcon class="h-4 w-4" />Quitter
							</Button>
						{/if}
						{#if isOwner}
							<Button onclick={openEdit} disabled={busy} variant="outline">
								<PencilIcon class="h-4 w-4" />Modifier
							</Button>
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

				<!-- Dialogue d'édition (propriétaire) -->
				<Dialog.Root bind:open={editOpen}>
					<Dialog.Content class="sm:max-w-lg">
						<Dialog.Header>
							<Dialog.Title>Modifier la campagne</Dialog.Title>
							<Dialog.Description>
								Mettez à jour les informations de votre campagne.
							</Dialog.Description>
						</Dialog.Header>
						<div class="space-y-4 py-2">
							{#if editError}
								<p
									class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500"
								>
									{editError}
								</p>
							{/if}
							<div class="space-y-1.5">
								<Label for="edit-name">Nom</Label>
								<Input
									id="edit-name"
									bind:value={editName}
									disabled={busy}
									maxlength={255}
								/>
								{#if !editValid}
									<p class="text-xs text-muted-foreground">
										Entre 3 et 255 caractères.
									</p>
								{/if}
							</div>
							<div class="space-y-1.5">
								<Label for="edit-description">Description</Label>
								<Textarea
									id="edit-description"
									bind:value={editDescription}
									disabled={busy}
									rows={4}
									class="resize-none"
								/>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
									<Label for="edit-visibility">Visibilité</Label>
									<NativeSelect.Root
										id="edit-visibility"
										bind:value={editVisibility}
										disabled={busy}
									>
										<NativeSelect.Option value="PRIVATE"
											>Privée</NativeSelect.Option
										>
										<NativeSelect.Option value="PUBLIC"
											>Publique</NativeSelect.Option
										>
									</NativeSelect.Root>
								</div>
								<div class="space-y-1.5">
									<Label for="edit-status">Statut</Label>
									<NativeSelect.Root
										id="edit-status"
										bind:value={editStatus}
										disabled={busy}
									>
										<NativeSelect.Option value="active"
											>Active</NativeSelect.Option
										>
										<NativeSelect.Option value="paused"
											>En pause</NativeSelect.Option
										>
										<NativeSelect.Option value="archived"
											>Archivée</NativeSelect.Option
										>
									</NativeSelect.Root>
								</div>
							</div>
							<div class="space-y-1.5">
								<Label for="edit-tags">Tags</Label>
								<TagInput id="edit-tags" bind:tags={editTags} disabled={busy} />
							</div>
						</div>
						<Dialog.Footer>
							<Button
								variant="outline"
								onclick={() => (editOpen = false)}
								disabled={busy}
							>
								Annuler
							</Button>
							<Button
								onclick={saveEdit}
								disabled={busy || !editValid}
								class="bg-red-600 text-white hover:bg-red-700"
							>
								Enregistrer
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>

				{#if actionError}
					<p
						class="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500"
					>
						{actionError}
					</p>
				{/if}

				{#if inviteLink}
					<div
						class="mb-6 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/30"
					>
						<p
							class="mb-2 text-sm font-medium text-slate-700 dark:text-red-300"
						>
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
									<span
										class="truncate font-medium text-slate-900 dark:text-white"
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
											session.scheduledAt ??
												session.endedAt ??
												session.startedAt
										)}
									</span>
								{/if}
							</div>
							<div class="flex shrink-0 items-center gap-1.5">
								{#if kind !== "past"}
									<Button
										size="sm"
										variant="outline"
										href={`/sessions/${session.id}/lobby`}
									>
										<DoorOpenIcon class="h-3.5 w-3.5" />Salle d'attente
									</Button>
								{/if}
								{#if isGm}
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
								{/if}
							</div>
						</div>
					{/snippet}

					<Card.Root>
						<Card.Header
							class="flex flex-row items-center justify-between gap-2"
						>
							<Card.Title>Sessions</Card.Title>
							<div class="flex rounded-lg border border-border p-0.5">
								<button
									type="button"
									onclick={() => (sessionView = "list")}
									class="rounded-md px-3 py-1 text-xs font-medium transition-colors {sessionView ===
									'list'
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:text-foreground'}"
								>
									Liste
								</button>
								<button
									type="button"
									onclick={() => (sessionView = "calendar")}
									class="rounded-md px-3 py-1 text-xs font-medium transition-colors {sessionView ===
									'calendar'
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:text-foreground'}"
								>
									Calendrier
								</button>
							</div>
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
								<p class="text-sm text-slate-400">
									Aucune session pour le moment.
								</p>
							{:else if sessionView === "calendar"}
								<SessionCalendar {sessions} />
							{/if}

							{#if sessionView === "list" && activeSessions.length > 0}
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

							{#if sessionView === "list" && upcomingSessions.length > 0}
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

							{#if sessionView === "list" && pastSessions.length > 0}
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
			</div>

			<!-- Colonne latérale -->
			<aside class="space-y-6 lg:sticky lg:top-6 lg:self-start">
				<!-- Demandes d'accès (MJ) -->
				{#if isGm && pendingRequests.length > 0}
					<Card.Root class="border-primary/40">
						<Card.Header>
							<Card.Title
								>Demandes en attente ({pendingRequests.length})</Card.Title
							>
						</Card.Header>
						<Card.Content class="space-y-2">
							{#each pendingRequests as request (request.id)}
								<div
									class="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
								>
									<span class="truncate text-sm text-foreground">
										{request.user?.pseudo ?? request.userId.slice(0, 8)}
									</span>
									<div class="flex shrink-0 gap-1.5">
										<Button
											size="sm"
											onclick={() => respondToRequest(request.id, true)}
											disabled={busy}
											class="bg-primary text-primary-foreground hover:bg-primary/90"
										>
											Accepter
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => respondToRequest(request.id, false)}
											disabled={busy}
										>
											Refuser
										</Button>
									</div>
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Personnages -->
				{#if isMember && campaign}
					<Card.Root>
						<Card.Header>
							<Card.Title>Personnages</Card.Title>
						</Card.Header>
						<Card.Content>
							<CampaignCharactersTab
								campaignId={campaign.id}
								{isGm}
								characterCreationLocked={!!(
									campaign as Record<string, unknown>
								)["characterCreationLocked"]}
								currentUserId={data.user?.id ?? ""}
							/>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Membres -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Membres ({members.length})</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each members as member (member.id)}
							<div
								class="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-border/40"
							>
								<span class="min-w-0 truncate text-sm text-foreground">
									{member.userId === data.user?.id
										? "Vous"
										: (member.user?.pseudo ?? member.userId.slice(0, 8))}
								</span>
								{#if isOwner && member.userId !== campaign.ownerId}
									<div class="flex shrink-0 items-center gap-1.5">
										<NativeSelect.Root
											value={member.role}
											disabled={busy}
											onchange={(e) =>
												changeMemberRole(
													member.userId,
													e.currentTarget.value as "gm" | "player" | "spectator"
												)}
											class="h-8 py-0 text-xs"
										>
											<NativeSelect.Option value="gm">MJ</NativeSelect.Option>
											<NativeSelect.Option value="player"
												>Joueur</NativeSelect.Option
											>
											<NativeSelect.Option value="spectator"
												>Spectateur</NativeSelect.Option
											>
										</NativeSelect.Root>
										<button
											type="button"
											onclick={() => kickMember(member.userId)}
											disabled={busy}
											class="rounded p-1.5 text-slate-400 hover:text-red-500"
											title="Expulser"
											aria-label="Expulser le membre"
										>
											<Trash2Icon class="h-4 w-4" />
										</button>
									</div>
								{:else}
									<Badge variant="secondary">{roleLabel(member.role)}</Badge>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-slate-400">Aucun membre.</p>
						{/each}
					</Card.Content>
				</Card.Root>

				{#if isMember}
					<!-- Chat temps réel -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Chat</Card.Title>
						</Card.Header>
						<Card.Content>
							<div
								bind:this={messagesEl}
								class="mb-3 h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3"
							>
								{#each messages as message (message.id)}
									{@const mine = message.userId === data.user?.id}
									<div
										class="flex flex-col {mine ? 'items-end' : 'items-start'}"
									>
										<div
											class="max-w-[75%] rounded-2xl px-3 py-1.5 text-sm break-words {mine
												? 'bg-primary text-primary-foreground'
												: 'border border-border bg-card'}"
										>
											{message.content}
										</div>
										<span class="mt-0.5 px-1 text-[10px] text-muted-foreground">
											{authorLabel(message)} · {formatDateTime(
												message.createdAt
											)}
										</span>
									</div>
								{:else}
									<p
										class="flex h-full items-center justify-center text-sm text-muted-foreground"
									>
										Aucun message. Lancez la conversation !
									</p>
								{/each}
							</div>
							<form
								onsubmit={(e) => {
									e.preventDefault();
									sendMessage();
								}}
								class="flex gap-2"
							>
								<Input
									placeholder="Votre message..."
									bind:value={chatInput}
									disabled={chatBusy}
									maxlength={2000}
								/>
								<Button
									type="submit"
									disabled={chatBusy || !chatInput.trim()}
									aria-label="Envoyer"
									class="bg-red-600 text-white hover:bg-red-700"
								>
									<SendIcon class="h-4 w-4" />
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				{/if}
			</aside>
		</div>
	{/if}
</div>
