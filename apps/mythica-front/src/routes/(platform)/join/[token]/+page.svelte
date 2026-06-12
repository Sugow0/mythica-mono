<script lang="ts">
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Empty from "$lib/components/ui/empty";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, campaignService } from "$lib/index.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const token = page.params.token ?? "";

	type Invite = NonNullable<
		Awaited<ReturnType<typeof campaignService.getInvite>>
	>;

	let campaign = $state<Invite["campaign"] | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isJoining = $state(false);

	async function loadInvite() {
		isLoading = true;
		error = null;
		try {
			const response = await campaignService.getInvite(token);
			campaign = response?.campaign ?? null;
		} catch (err) {
			if (err instanceof ApiError && err.statusCode === 410) {
				error = "Ce lien d'invitation a expire.";
			} else if (err instanceof ApiError && err.statusCode === 404) {
				error = "Ce lien d'invitation est invalide.";
			} else {
				error = "Impossible de charger l'invitation.";
			}
		} finally {
			isLoading = false;
		}
	}

	async function join() {
		isJoining = true;
		error = null;
		try {
			const response = await campaignService.acceptInvite(token);
			const campaignId = response?.campaignId;
			if (campaignId) {
				await goto(`/campaigns/${campaignId}`);
			}
		} catch (err) {
			error =
				err instanceof ApiError ? err.message : "Impossible de rejoindre.";
			isJoining = false;
		}
	}

	onMount(loadInvite);
</script>

<div class="mx-auto flex max-w-lg flex-col px-6 py-16">
	{#if isLoading}
		<Skeleton class="h-56 w-full rounded-xl" />
	{:else if error || !campaign}
		<Empty.Root class="py-16">
			<Empty.Header>
				<Empty.Media variant="icon">
					<SwordsIcon class="h-6 w-6 text-orange-600 dark:text-orange-400" />
				</Empty.Media>
				<Empty.Title>Invitation indisponible</Empty.Title>
				<Empty.Description
					>{error ?? "Invitation introuvable."}</Empty.Description
				>
			</Empty.Header>
			<Empty.Content>
				<Button href="/campaigns" variant="outline"
					>Explorer les campagnes</Button
				>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<Card.Root>
			<Card.Header class="text-center">
				<div
					class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950"
				>
					<SwordsIcon class="h-7 w-7 text-orange-600 dark:text-orange-400" />
				</div>
				<Card.Title class="text-2xl">Vous êtes invité !</Card.Title>
				<Card.Description>
					Rejoignez la campagne <strong>{campaign.nom}</strong>.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if campaign.description}
					<p
						class="rounded-lg bg-stone-50 px-4 py-3 text-sm text-slate-600 dark:bg-muted/30 dark:text-muted-foreground"
					>
						{campaign.description}
					</p>
				{/if}

				{#if error}
					<p class="text-sm text-rose-500">{error}</p>
				{/if}

				{#if data.user}
					<Button
						onclick={join}
						disabled={isJoining}
						class="w-full bg-orange-600 text-white hover:bg-orange-700"
					>
						{isJoining ? "Connexion..." : "Rejoindre la campagne"}
					</Button>
				{:else}
					<p
						class="text-center text-sm text-slate-500 dark:text-muted-foreground"
					>
						Connectez-vous pour rejoindre cette campagne.
					</p>
					<Button
						href="/sign-in"
						class="w-full bg-orange-600 text-white hover:bg-orange-700"
					>
						Se connecter
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
