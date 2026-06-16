<script lang="ts">
	import PlusIcon from "@lucide/svelte/icons/plus";
	import UserIcon from "@lucide/svelte/icons/user";
	import { onMount } from "svelte";
	import type { CharacterSheetListItem } from "$lib/api/services/character-service";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Empty from "$lib/components/ui/empty";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, characterService } from "$lib/index.js";
	import * as m from "$lib/paraglide/messages.js";

	let sheets = $state<CharacterSheetListItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		isLoading = true;
		error = null;
		try {
			const response = await characterService.getCharacterSheets();
			sheets = response?.items ?? [];
		} catch (err) {
			error = err instanceof ApiError ? err.message : m.characters_load_error();
		} finally {
			isLoading = false;
		}
	}

	onMount(load);
</script>

<div class="mx-auto max-w-5xl px-6 py-8">
	<div class="mb-8 flex items-end justify-between gap-4">
		<div>
			<h1 class="font-display text-3xl font-bold">{m.characters_title()}</h1>
			<p class="text-muted-foreground mt-1">{m.characters_subtitle()}</p>
		</div>
		<Button href="/characters/new">
			<PlusIcon class="h-4 w-4" />
			{m.characters_create()}
		</Button>
	</div>

	{#if isLoading}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(3) as _, i (i)}
				<Skeleton class="h-40 w-full rounded-xl" />
			{/each}
		</div>
	{:else if error}
		<p class="text-destructive" role="alert">{error}</p>
	{:else if sheets.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon">
					<UserIcon class="h-6 w-6" />
				</Empty.Media>
				<Empty.Title>{m.characters_empty_title()}</Empty.Title>
				<Empty.Description>{m.characters_empty_desc()}</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button href="/characters/new">
					<PlusIcon class="h-4 w-4" />
					{m.characters_create()}
				</Button>
			</Empty.Content>
		</Empty.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each sheets as sheet (sheet.id)}
				<a href="/characters/{sheet.id}" class="block" data-testid="sheet-card">
					<Card.Root class="hover:border-primary/50 h-full transition-colors">
						<Card.Header>
							<div class="flex items-center gap-3">
								<div
									class="bg-muted flex h-10 w-10 items-center justify-center rounded-full"
								>
									<UserIcon class="text-muted-foreground h-5 w-5" />
								</div>
								<div class="min-w-0">
									<Card.Title class="truncate">{sheet.name}</Card.Title>
									<p class="text-muted-foreground truncate text-xs">
										{sheet.gameSystem.nom}
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
