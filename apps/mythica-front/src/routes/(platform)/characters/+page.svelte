<script lang="ts">
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import UserIcon from "@lucide/svelte/icons/user";
	import { onMount } from "svelte";
	import type { CharacterSheetListItem } from "$lib/api/services/character-service";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
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
	let pendingDelete = $state<CharacterSheetListItem | null>(null);
	let deleting = $state(false);

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

	async function confirmDelete() {
		if (!pendingDelete) return;
		deleting = true;
		try {
			await characterService.deleteCharacterSheet(pendingDelete.id);
			sheets = sheets.filter((s) => s.id !== pendingDelete?.id);
			pendingDelete = null;
		} catch {
			// On garde la fiche en cas d'échec.
		} finally {
			deleting = false;
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
				<Card.Root
					class="group hover:border-primary/50 relative h-full transition-colors"
					data-testid="sheet-card"
				>
					<!-- Lien étiré : toute la carte est cliquable. -->
					<a
						href="/characters/{sheet.id}"
						class="absolute inset-0 z-0 rounded-xl"
						aria-label={sheet.name}
					></a>
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
								</p>
							</div>
						</div>
					</Card.Header>
					<Card.Footer class="relative z-10 justify-between">
						<Badge variant="secondary">{sheet.gameSystem.slug}</Badge>
						<Button
							variant="ghost"
							size="icon"
							class="text-muted-foreground hover:text-destructive h-8 w-8"
							aria-label="Supprimer {sheet.name}"
							onclick={() => (pendingDelete = sheet)}
						>
							<Trash2Icon class="h-4 w-4" />
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}

	<AlertDialog.Root
		open={pendingDelete !== null}
		onOpenChange={(o) => {
			if (!o) pendingDelete = null;
		}}
	>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Supprimer ce personnage ?</AlertDialog.Title>
				<AlertDialog.Description>
					La fiche « {pendingDelete?.name} » sera supprimée. Cette action est définitive.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel disabled={deleting}>Annuler</AlertDialog.Cancel>
				<Button
					variant="destructive"
					onclick={confirmDelete}
					disabled={deleting}
				>
					{#if deleting}
						<LoaderIcon class="h-4 w-4 animate-spin" />
					{:else}
						<Trash2Icon class="h-4 w-4" />
					{/if}
					Supprimer
				</Button>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</div>
