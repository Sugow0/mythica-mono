<script lang="ts">
	import type { CampaignCharacterSheet } from "$lib/api/services/campaign-character-sheets-service";
	import XIcon from "@lucide/svelte/icons/x";
	import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";

	let {
		campaignSheets,
		onClose,
	}: {
		campaignSheets: CampaignCharacterSheet[];
		onClose: () => void;
	} = $props();

	function handleDragStart(e: DragEvent, sheet: CampaignCharacterSheet) {
		if (e.dataTransfer) {
			const payload = {
				type: "character_sheet",
				sheetId: sheet.characterSheet.id,
				label: sheet.characterSheet.name,
				fileId: sheet.characterSheet.avatarFile?.id ?? null,
			};
			e.dataTransfer.setData("application/json", JSON.stringify(payload));
			e.dataTransfer.effectAllowed = "copy";
		}
	}
</script>

<div
	class="fixed bottom-4 left-4 z-40 flex w-64 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
>
	<div class="flex items-center justify-between border-b border-slate-700 p-3">
		<h2 class="text-sm font-semibold text-slate-200">Acteurs (Tokens)</h2>
		<button
			onclick={onClose}
			class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>
	<div class="flex max-h-[60vh] flex-col overflow-y-auto p-2 gap-2">
		{#if campaignSheets.length === 0}
			<p class="p-4 text-center text-xs text-slate-500">
				Aucun personnage dans la campagne.
			</p>
		{:else}
			{#each campaignSheets as sheet (sheet.id)}
				<div
					draggable="true"
					ondragstart={(e) => handleDragStart(e, sheet)}
					class="flex cursor-grab items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 p-2 transition-colors hover:border-slate-600 hover:bg-slate-800 active:cursor-grabbing"
					title="Glissez sur la carte pour créer un token"
				>
					<GripVerticalIcon class="h-4 w-4 text-slate-500" />
					{#if sheet.characterSheet.avatarFile}
						<img
							src={`/api/gameplay/files/${sheet.characterSheet.avatarFile.id}/content`}
							alt={sheet.characterSheet.name}
							class="h-8 w-8 rounded-full object-cover border border-slate-700 bg-slate-900"
						/>
					{:else}
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300"
						>
							{sheet.characterSheet.name.substring(0, 2).toUpperCase()}
						</div>
					{/if}
					<div class="flex flex-col">
						<span class="text-sm font-medium text-slate-200"
							>{sheet.characterSheet.name}</span
						>
						<span class="text-[10px] text-slate-400"
							>{sheet.status === "active" ? "Actif" : "Inactif"}</span
						>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
