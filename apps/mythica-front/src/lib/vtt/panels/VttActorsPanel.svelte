<script lang="ts">
	import XIcon from "@lucide/svelte/icons/x";
	import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import UsersIcon from "@lucide/svelte/icons/users";

	import type { CampaignCharacterSheet } from "$lib/api/services/campaign-character-sheets-service";

	let {
		campaignSheets,
		onClose,
		onOpenSheet,
	}: {
		campaignSheets: CampaignCharacterSheet[];
		onClose: () => void;
		onOpenSheet: (sheetId: string) => void;
	} = $props();

	function handleDragStart(e: DragEvent, sheet: CampaignCharacterSheet) {
		if (e.dataTransfer && sheet.name) {
			const payload = {
				type: "character_sheet",
				sheetId: sheet.characterSheetId,
				label: sheet.name,
				fileId: sheet.avatarFileId ?? null,
			};
			e.dataTransfer.setData("application/json", JSON.stringify(payload));
			e.dataTransfer.effectAllowed = "copy";
		}
	}
</script>

<div
	class="fixed right-20 top-20 z-50 flex w-80 flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-background/70 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 ease-out"
>
	<div
		class="flex items-center justify-between border-b border-border/30 px-4 py-3"
	>
		<div class="flex items-center gap-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				<UsersIcon class="h-4 w-4" />
			</div>
			<h2 class="text-sm font-medium tracking-tight text-foreground">
				Acteurs
			</h2>
		</div>
		<button
			onclick={onClose}
			class="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
		>
			<XIcon class="h-4 w-4" />
		</button>
	</div>
	<div
		class="flex max-h-[60vh] flex-col gap-2 overflow-x-hidden overflow-y-auto p-4 scrollbar-none"
	>
		{#if campaignSheets.length === 0}
			<div
				class="flex h-32 flex-col items-center justify-center gap-2 text-center text-muted-foreground"
			>
				<UsersIcon class="h-8 w-8 opacity-20" />
				<p class="text-sm">Aucun personnage<br />dans la campagne.</p>
			</div>
		{:else}
			{#each campaignSheets as sheet (sheet.id)}
				<div
					role="listitem"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, sheet)}
					class="group flex cursor-grab items-center gap-3 rounded-[1rem] border border-border/20 bg-secondary/40 p-2.5 transition-all hover:bg-secondary/80 hover:shadow-sm active:cursor-grabbing active:scale-[0.98]"
					title="Glissez sur la carte pour créer un token"
				>
					<GripVerticalIcon
						class="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground"
					/>
					<div class="relative h-10 w-10 shrink-0">
						{#if sheet.avatarUrl}
							<img
								src={sheet.avatarUrl}
								alt={sheet.name}
								class="h-full w-full rounded-full border border-border/50 object-cover bg-secondary transition-colors"
							/>
						{:else if sheet.avatarFileId}
							<img
								src={`${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay/files/${sheet.avatarFileId}/content`}
								alt={sheet.name}
								class="h-full w-full rounded-full border border-border/50 object-cover bg-secondary transition-colors"
							/>
						{:else}
							<div
								class="flex h-full w-full items-center justify-center rounded-full border border-border/50 bg-secondary text-sm font-bold text-muted-foreground transition-colors"
							>
								{sheet.name.substring(0, 2).toUpperCase()}
							</div>
						{/if}
						<div
							class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background {sheet.status ===
							'active'
								? 'bg-green-500'
								: 'bg-slate-400'}"
						></div>
					</div>
					<div class="flex flex-1 flex-col overflow-hidden">
						<span class="truncate text-sm font-medium text-foreground"
							>{sheet.name}</span
						>
						<span class="text-xs text-muted-foreground"
							>{sheet.status === "active"
								? "Joueur Actif"
								: "PNJ / Inactif"}</span
						>
					</div>
					<button
						class="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground opacity-0 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm group-hover:opacity-100"
						title="Ouvrir la fiche de personnage"
						onclick={(e) => {
							e.stopPropagation();
							onOpenSheet(sheet.characterSheetId);
						}}
					>
						<FileTextIcon class="h-4 w-4" />
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>
