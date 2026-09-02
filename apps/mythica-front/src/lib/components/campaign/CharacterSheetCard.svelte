<script lang="ts">
	import ScrollTextIcon from "@lucide/svelte/icons/scroll-text";
	import ShieldOffIcon from "@lucide/svelte/icons/shield-off";
	import SwordIcon from "@lucide/svelte/icons/sword";
	import type {
		CampaignCharacterSheet,
		CampaignSheetStatus,
	} from "$lib/api/services/campaign-character-sheets-service";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";

	interface Props {
		sheet: CampaignCharacterSheet;
		isGm?: boolean;
		hasActiveSheet?: boolean;
		onActivate?: () => void;
		onRequestChange?: () => void;
		onDisable?: () => void;
		onReactivate?: () => void;
		onView?: () => void;
	}

	let {
		sheet,
		isGm = false,
		hasActiveSheet = false,
		onActivate,
		onRequestChange,
		onDisable,
		onReactivate,
		onView,
	}: Props = $props();

	function statusBadge(status: CampaignSheetStatus) {
		switch (status) {
			case "active":
				return { label: "Active", variant: "default" } as const;
			case "inactive":
				return { label: "Disponible", variant: "secondary" } as const;
			case "disabled":
				return { label: "Désactivée", variant: "destructive" } as const;
		}
	}

	const badge = $derived(statusBadge(sheet.status));
</script>

<Card.Root class="gap-3 p-4">
	<div class="flex items-start justify-between gap-2">
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="border-primary/30 bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border"
			>
				{#if sheet.avatarUrl}
					<img
						src={sheet.avatarUrl}
						alt={sheet.name}
						class="h-full w-full object-cover"
					/>
				{:else if sheet.status === "active"}
					<SwordIcon class="text-primary size-4 shrink-0" />
				{:else if sheet.status === "disabled"}
					<ShieldOffIcon class="size-4 shrink-0 text-muted-foreground" />
				{:else}
					<ScrollTextIcon class="size-4 shrink-0 text-muted-foreground" />
				{/if}
			</div>
			<span class="truncate text-sm font-medium">{sheet.name}</span>
		</div>
		<Badge variant={badge.variant}>{badge.label}</Badge>
	</div>

	<div class="flex flex-wrap gap-2">
		{#if onView}
			<Button size="sm" variant="outline" onclick={onView}>Voir</Button>
		{/if}

		{#if !isGm}
			{#if sheet.status === "inactive" && !hasActiveSheet && onActivate}
				<Button size="sm" onclick={onActivate}>Activer</Button>
			{:else if sheet.status === "inactive" && hasActiveSheet && onRequestChange}
				<Button size="sm" variant="outline" onclick={onRequestChange}>
					Demander switch
				</Button>
			{/if}
		{:else}
			{#if sheet.status !== "disabled" && onDisable}
				<Button size="sm" variant="destructive" onclick={onDisable}
					>Désactiver</Button
				>
			{/if}
			{#if sheet.status === "disabled" && onReactivate}
				<Button size="sm" variant="outline" onclick={onReactivate}
					>Réactiver</Button
				>
			{/if}
		{/if}
	</div>
</Card.Root>
