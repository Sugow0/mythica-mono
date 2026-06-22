<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import UserIcon from "@lucide/svelte/icons/user";
	import { onMount } from "svelte";
	import type { PublicSheetItem } from "$lib/api/services/character-service";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Empty from "$lib/components/ui/empty";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, characterService } from "$lib/index.js";

	let sheets = $state<PublicSheetItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		isLoading = true;
		error = null;
		try {
			const response = await characterService.getPublicSheets();
			sheets = response?.items ?? [];
		} catch (err) {
			error =
				err instanceof ApiError
					? err.message
					: "Impossible de charger les builds publics.";
		} finally {
			isLoading = false;
		}
	}

	onMount(load);
</script>

<div class="mx-auto max-w-5xl px-6 py-8">
	<Button variant="ghost" href="/characters" class="mb-4">
		<ArrowLeftIcon class="h-4 w-4" /> Mes personnages
	</Button>

	<div class="mb-8">
		<h1 class="font-display text-3xl font-bold">Builds publics</h1>
		<p class="text-muted-foreground mt-1">
			Inspirez-vous des personnages partagés par la communauté.
		</p>
	</div>

	{#if isLoading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i (i)}
				<Skeleton class="h-24 rounded-xl" />
			{/each}
		</div>
	{:else if error}
		<p class="text-destructive" role="alert">{error}</p>
	{:else if sheets.length === 0}
		<Empty.Root>
			<Empty.Title>Aucun build public pour l'instant</Empty.Title>
			<Empty.Description>
				Passez une de vos fiches en « Publique » pour la partager ici.
			</Empty.Description>
		</Empty.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each sheets as sheet (sheet.id)}
				<a href="/characters/{sheet.id}" class="block">
					<Card.Root class="hover:border-primary/50 h-full transition-colors">
						<Card.Header>
							<div class="flex items-center gap-3">
								<div
									class="border-primary/30 bg-muted flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
								>
									{#if sheet.avatarUrl}
										<img
											src={sheet.avatarUrl}
											alt=""
											class="h-full w-full object-cover"
										/>
									{:else}
										<UserIcon class="text-muted-foreground h-5 w-5" />
									{/if}
								</div>
								<div class="min-w-0">
									<Card.Title class="truncate">{sheet.name}</Card.Title>
									<p class="text-muted-foreground truncate text-xs">
										{sheet.gameSystem.nom}
										{#if sheet.ownerPseudo}· par {sheet.ownerPseudo}{/if}
									</p>
								</div>
							</div>
						</Card.Header>
						<Card.Footer>
							<Badge variant="secondary">{sheet.gameSystem.slug}</Badge>
						</Card.Footer>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>
