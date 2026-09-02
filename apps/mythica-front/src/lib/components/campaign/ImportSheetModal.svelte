<script lang="ts">
	import { onMount } from "svelte";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { characterService } from "$lib/index.js";
	import type { CharacterSheetListItem } from "$lib/api/services/character-service";

	interface Props {
		open: boolean;
		title?: string;
		onClose: () => void;
		onSelect: (sheetId: string) => void;
	}

	let {
		open = $bindable(),
		title = "Choisir une fiche",
		onClose,
		onSelect,
	}: Props = $props();

	let sheets = $state<CharacterSheetListItem[]>([]);
	let loading = $state(false);

	onMount(async () => {
		loading = true;
		try {
			const result = await characterService.getCharacterSheets();
			sheets = result?.items ?? [];
		} finally {
			loading = false;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				Une copie indépendante sera créée pour la campagne.
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-80 space-y-2 overflow-y-auto">
			{#if loading}
				<p class="text-muted-foreground py-8 text-center text-sm">
					Chargement…
				</p>
			{:else if sheets.length === 0}
				<p class="text-muted-foreground py-8 text-center text-sm">
					Aucune fiche disponible.
				</p>
			{:else}
				{#each sheets as sheet (sheet.id)}
					<Card.Root
						class="hover:border-primary cursor-pointer gap-2 p-3 transition-colors"
						onclick={() => {
							onSelect(sheet.id);
							open = false;
						}}
					>
						<p class="text-sm font-medium">{sheet.name}</p>
						<p class="text-muted-foreground text-xs">{sheet.gameSystem.nom}</p>
					</Card.Root>
				{/each}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose}>Annuler</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
