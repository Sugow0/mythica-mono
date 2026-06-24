<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import PlayIcon from "@lucide/svelte/icons/play";
	import RadioIcon from "@lucide/svelte/icons/radio";
	import UsersIcon from "@lucide/svelte/icons/users";
	import { onDestroy, onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Empty from "$lib/components/ui/empty";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, campaignService } from "$lib/index.js";
	import {
		countOnline,
		parsePresenceEvent,
		roleLabel,
		sessionStatusLabel,
	} from "$lib/utils/lobby";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const sessionId = page.params.id ?? "";

	type SessionDetail = NonNullable<
		Awaited<ReturnType<typeof campaignService.getSession>>
	>;
	type SessionInfo = SessionDetail["campaign"];
	type Member = SessionDetail["members"][number];

	let session = $state<SessionDetail["session"] | null>(null);
	let campaign = $state<SessionInfo | null>(null);
	let members = $state<Member[]>([]);
	let connected = $state<Set<string>>(new Set());
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let busy = $state(false);
	let eventSource: EventSource | null = null;

	const isOwner = $derived(campaign?.ownerId === data.user?.id);
	const myRole = $derived(
		members.find((m) => m.userId === data.user?.id)?.role ?? null
	);
	const isGm = $derived(isOwner || myRole === "gm");
	const isActive = $derived(session?.status === "active");
	const onlineCount = $derived(
		countOnline(
			members.map((m) => m.userId),
			connected
		)
	);

	function memberName(member: Member) {
		if (member.userId === data.user?.id) return "Vous";
		return member.user?.pseudo ?? member.userId.slice(0, 8);
	}

	async function loadSession() {
		isLoading = true;
		error = null;
		try {
			const response = await campaignService.getSession(sessionId);
			session = response?.session ?? null;
			campaign = response?.campaign ?? null;
			members = response?.members ?? [];
		} catch (err) {
			if (err instanceof ApiError && err.statusCode === 404) {
				error = "Cette session n'existe pas ou a été supprimée.";
			} else if (err instanceof ApiError && err.statusCode === 403) {
				error = "Vous n'avez pas accès à cette session.";
			} else {
				error = "Impossible de charger la salle d'attente.";
			}
		} finally {
			isLoading = false;
		}
	}

	function connectPresence() {
		eventSource?.close();
		eventSource = new EventSource(
			campaignService.presenceStreamUrl(sessionId),
			{
				withCredentials: true,
			}
		);
		eventSource.onmessage = (event) => {
			const payload = parsePresenceEvent(event.data);
			if (!payload) return;
			connected = new Set(payload.users);
			// Le MJ peut lancer la session depuis un autre onglet : on reflète
			// le changement de statut diffusé en temps réel.
			if (payload.status && session) {
				session = {
					...session,
					status: payload.status as SessionDetail["session"]["status"],
				};
				if (payload.status === "active") {
					goto(`/sessions/${sessionId}/table`);
				}
			}
		};
	}

	async function launch() {
		if (busy) return;
		busy = true;
		actionError = null;
		try {
			await campaignService.launchSession(sessionId);
			if (session) session = { ...session, status: "active" };
			goto(`/sessions/${sessionId}/table`);
		} catch (err) {
			actionError =
				err instanceof ApiError
					? err.message
					: "Impossible de lancer la session.";
		} finally {
			busy = false;
		}
	}

	onMount(async () => {
		await loadSession();
		if (session?.status === "active") {
			goto(`/sessions/${sessionId}/table`);
			return;
		}
		if (session) connectPresence();
	});

	onDestroy(() => eventSource?.close());
</script>

<div class="mx-auto max-w-3xl px-6 py-8">
	<Button
		variant="ghost"
		href={campaign ? `/campaigns/${campaign.id}` : "/campaigns"}
		class="mb-6 -ml-2 text-slate-600 hover:text-red-600 dark:text-muted-foreground"
	>
		<ArrowLeftIcon class="h-4 w-4" />
		Retour à la campagne
	</Button>

	{#if isLoading}
		<Skeleton class="h-64 w-full rounded-xl" />
	{:else if error}
		<Empty.Root class="py-20">
			<Empty.Header>
				<Empty.Title>Salle d'attente indisponible</Empty.Title>
				<Empty.Description>{error}</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/campaigns" variant="outline">Retour aux campagnes</Button
				>
			</Empty.Content>
		</Empty.Root>
	{:else if session}
		<!-- En-tête de session -->
		<div class="mb-6 text-center">
			{#if campaign}
				<p
					class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400"
				>
					{campaign.nom}
				</p>
			{/if}
			<h1
				class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
			>
				{session.nom}
			</h1>
			<div class="mt-3 flex items-center justify-center gap-2">
				{#if isActive}
					<Badge class="bg-red-600 text-white hover:bg-red-600">
						<RadioIcon class="mr-1 h-3 w-3 animate-pulse" />
						{sessionStatusLabel(session.status)}
					</Badge>
				{:else}
					<Badge variant="secondary">
						<ClockIcon class="mr-1 h-3 w-3" />
						{sessionStatusLabel(session.status)}
					</Badge>
				{/if}
			</div>
		</div>

		{#if actionError}
			<p class="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
				{actionError}
			</p>
		{/if}

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between gap-2">
				<Card.Title class="flex items-center gap-2">
					<UsersIcon class="h-4 w-4" />
					Joueurs présents
				</Card.Title>
				<span class="text-sm text-muted-foreground">
					{onlineCount}/{members.length} en ligne
				</span>
			</Card.Header>
			<Card.Content class="space-y-2">
				{#each members as member (member.id)}
					{@const online = connected.has(member.userId)}
					<div
						class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors {online
							? 'border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20'
							: 'border-slate-100 dark:border-border/40'}"
					>
						<div class="flex min-w-0 items-center gap-2.5">
							<span
								class="relative flex h-2.5 w-2.5 shrink-0"
								title={online ? "En ligne" : "Hors ligne"}
							>
								{#if online}
									<span
										class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
									></span>
									<span
										class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
									></span>
								{:else}
									<span
										class="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600"
									></span>
								{/if}
							</span>
							<span class="truncate text-sm text-foreground">
								{memberName(member)}
							</span>
						</div>
						<Badge variant={online ? "secondary" : "outline"} class="shrink-0">
							{roleLabel(member.role)}
						</Badge>
					</div>
				{:else}
					<p class="py-4 text-center text-sm text-muted-foreground">
						Aucun membre dans cette campagne.
					</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Action du MJ -->
		<div class="mt-6 flex flex-col items-center gap-2">
			{#if isActive}
				<p class="text-sm text-muted-foreground">
					La session est en cours. Bon jeu !
				</p>
			{:else if isGm}
				<Button
					onclick={launch}
					disabled={busy || session.status === "ended"}
					size="lg"
					class="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
				>
					<PlayIcon class="h-4 w-4" />
					{busy ? "Lancement…" : "Lancer la session"}
				</Button>
				{#if session.status === "ended"}
					<p class="text-xs text-muted-foreground">
						Cette session est terminée.
					</p>
				{/if}
			{:else}
				<p class="text-sm text-muted-foreground">
					En attente du lancement par le MJ…
				</p>
			{/if}
		</div>
	{/if}
</div>
