<script lang="ts">
	import PlusIcon from "@lucide/svelte/icons/plus";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import CheckIcon from "@lucide/svelte/icons/check";
	import XIcon from "@lucide/svelte/icons/x";
	import { SvelteMap } from "svelte/reactivity";
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import * as Separator from "$lib/components/ui/separator";
	import {
		campaignCharacterSheetsService,
		type CampaignCharacterSheet,
		type CampaignPoolSheet,
		type CampaignPoolRequest,
		type CampaignChangeRequest,
	} from "$lib/api/services/campaign-character-sheets-service";
	import CharacterSheetCard from "./CharacterSheetCard.svelte";
	import ImportSheetModal from "./ImportSheetModal.svelte";
	import ActivateSheetDialog from "./ActivateSheetDialog.svelte";
	import * as Sheet from "$lib/components/ui/sheet";
	import CharacterSheetViewer from "$lib/components/character-sheet/character-sheet-viewer.svelte";

	interface Props {
		campaignId: string;
		isGm: boolean;
		characterCreationLocked: boolean;
		currentUserId: string;
	}

	let { campaignId, isGm, characterCreationLocked, currentUserId }: Props =
		$props();

	// ── State ──────────────────────────────────────────────────────────────────
	let mySheets = $state<CampaignCharacterSheet[]>([]);
	let allSheets = $state<CampaignCharacterSheet[]>([]);
	let poolSheets = $state<CampaignPoolSheet[]>([]);
	let poolRequests = $state<CampaignPoolRequest[]>([]);
	let changeRequests = $state<CampaignChangeRequest[]>([]);
	let loading = $state(true);
	let actionError = $state<string | null>(null);

	let importOpen = $state(false);
	let importForPool = $state(false);
	let activateDialogSheet = $state<CampaignCharacterSheet | null>(null);
	let viewSheetId = $state<string | null>(null);

	// ── Computed ───────────────────────────────────────────────────────────────
	const hasActiveSheet = $derived(mySheets.some((s) => s.status === "active"));

	// ── Load ───────────────────────────────────────────────────────────────────
	async function load() {
		loading = true;
		actionError = null;
		try {
			const [sheets, pool] = await Promise.all([
				campaignCharacterSheetsService.getCampaignSheets(campaignId),
				campaignCharacterSheetsService.getPool(campaignId),
			]);
			mySheets = (sheets ?? []).filter((s) => s.userId === currentUserId);
			allSheets = sheets ?? [];
			poolSheets = pool;

			if (isGm) {
				const [poolReqs, changeReqs] = await Promise.all([
					campaignCharacterSheetsService.getPoolRequests(campaignId),
					campaignCharacterSheetsService.getChangeRequests(campaignId),
				]);
				poolRequests = poolReqs;
				changeRequests = changeReqs;
			}
		} catch (e) {
			actionError = (e as Error).message ?? "Erreur de chargement";
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	// ── Actions joueur ─────────────────────────────────────────────────────────
	async function handleImport(sheetId: string) {
		try {
			if (importForPool) {
				await campaignCharacterSheetsService.importToPool(campaignId, sheetId);
			} else {
				await campaignCharacterSheetsService.importSheet(campaignId, sheetId);
			}
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleActivate(sheet: CampaignCharacterSheet) {
		try {
			await campaignCharacterSheetsService.activateSheet(campaignId, sheet.id);
			activateDialogSheet = null;
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleRequestChange(sheet: CampaignCharacterSheet) {
		try {
			await campaignCharacterSheetsService.requestCharacterChange(
				campaignId,
				sheet.id
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleRequestPool(poolSheetId: string) {
		try {
			await campaignCharacterSheetsService.requestPoolSheet(
				campaignId,
				poolSheetId
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	// ── Actions MJ ─────────────────────────────────────────────────────────────
	async function handleDisable(sheet: CampaignCharacterSheet) {
		try {
			await campaignCharacterSheetsService.disableSheet(campaignId, sheet.id);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleReactivate(sheet: CampaignCharacterSheet) {
		try {
			await campaignCharacterSheetsService.reactivateSheet(
				campaignId,
				sheet.id
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleToggleVisibility(ps: CampaignPoolSheet) {
		try {
			await campaignCharacterSheetsService.setPoolSheetVisibility(
				campaignId,
				ps.id,
				!ps.visibleToPlayers
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleDeletePoolSheet(poolSheetId: string) {
		try {
			await campaignCharacterSheetsService.deletePoolSheet(
				campaignId,
				poolSheetId
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleApproveChange(req: CampaignChangeRequest) {
		try {
			await campaignCharacterSheetsService.approveChangeRequest(
				campaignId,
				req.id
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleRejectChange(req: CampaignChangeRequest) {
		try {
			await campaignCharacterSheetsService.rejectChangeRequest(
				campaignId,
				req.id
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleConfirmPool(req: CampaignPoolRequest) {
		try {
			await campaignCharacterSheetsService.confirmPoolRequest(
				campaignId,
				req.poolSheetId,
				req.id
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	async function handleRejectPool(req: CampaignPoolRequest) {
		try {
			await campaignCharacterSheetsService.rejectPoolRequest(
				campaignId,
				req.poolSheetId,
				req.id
			);
			await load();
		} catch (e) {
			actionError = (e as Error).message;
		}
	}

	// Regrouper les fiches par userId pour la vue MJ
	const sheetsByPlayer = $derived.by(() => {
		const map = new SvelteMap<string, CampaignCharacterSheet[]>();
		for (const s of allSheets) {
			if (!map.has(s.userId)) map.set(s.userId, []);
			map.get(s.userId)!.push(s);
		}
		return map;
	});
</script>

{#if loading}
	<p class="text-muted-foreground py-12 text-center text-sm">Chargement…</p>
{:else}
	{#if actionError}
		<p class="text-destructive mb-4 text-sm">{actionError}</p>
	{/if}

	<!-- ── VUE JOUEUR ──────────────────────────────────────────────────────── -->
	{#if !isGm}
		<!-- Mes fiches dans la campagne -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold">Mes fiches</h3>
				{#if !characterCreationLocked}
					<div class="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onclick={() => goto(`/characters/new?campaignId=${campaignId}`)}
						>
							<PlusIcon class="size-3.5" />
							Créer
						</Button>
						<Button
							size="sm"
							variant="outline"
							onclick={() => {
								importForPool = false;
								importOpen = true;
							}}
						>
							<UploadIcon class="size-3.5" />
							Importer
						</Button>
					</div>
				{/if}
			</div>

			{#if mySheets.length === 0}
				<p class="text-muted-foreground text-sm">
					Aucune fiche dans cette campagne.
				</p>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each mySheets as sheet (sheet.id)}
						<CharacterSheetCard
							{sheet}
							{hasActiveSheet}
							onActivate={() => (activateDialogSheet = sheet)}
							onRequestChange={() => handleRequestChange(sheet)}
							onView={() => (viewSheetId = sheet.characterSheetId)}
						/>
					{/each}
				</div>
			{/if}
		</section>

		<Separator.Root class="my-5" />

		<!-- Fiches disponibles (pool MJ) -->
		<section class="space-y-3">
			<h3 class="text-sm font-semibold">Fiches disponibles (pool MJ)</h3>

			{#if poolSheets.length === 0}
				<p class="text-muted-foreground text-sm">
					Aucune fiche proposée pour l'instant.
				</p>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each poolSheets as ps (ps.id)}
						<Card.Root class="gap-3 p-4">
							<p class="text-sm font-medium">{ps.name}</p>
							{#if ps.alreadyRequested}
								<Badge variant="secondary">Demandée (en attente)</Badge>
							{:else}
								<Button size="sm" onclick={() => handleRequestPool(ps.id)}>
									Demander
								</Button>
							{/if}
						</Card.Root>
					{/each}
				</div>
			{/if}
		</section>

		<!-- ── VUE MJ ──────────────────────────────────────────────────────────── -->
	{:else}
		<!-- Fiches des joueurs -->
		<section class="space-y-4">
			<h3 class="text-sm font-semibold">Fiches des joueurs</h3>

			{#if allSheets.length === 0}
				<p class="text-muted-foreground text-sm">
					Aucune fiche pour l'instant.
				</p>
			{:else}
				{#each [...sheetsByPlayer] as [userId, sheets] (userId)}
					<div class="space-y-2">
						<p class="text-muted-foreground text-xs">
							Joueur {userId.slice(0, 8)}…
						</p>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each sheets as sheet (sheet.id)}
								<CharacterSheetCard
									{sheet}
									isGm={true}
									onDisable={() => handleDisable(sheet)}
									onReactivate={() => handleReactivate(sheet)}
									onView={() => (viewSheetId = sheet.characterSheetId)}
								/>
							{/each}
						</div>
					</div>
				{/each}
			{/if}

			<!-- Demandes de changement -->
			{#if changeRequests.length > 0}
				<div class="space-y-2">
					<h4 class="text-sm font-medium">
						Demandes de changement de personnage
					</h4>
					{#each changeRequests as req (req.id)}
						<Card.Root class="flex items-center justify-between gap-3 p-3">
							<p class="text-sm">
								Joueur {req.playerId.slice(0, 8)}… →
								<strong>{req.targetSheetName}</strong>
							</p>
							<div class="flex gap-2">
								<Button size="sm" onclick={() => handleApproveChange(req)}>
									<CheckIcon class="size-3.5" />
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onclick={() => handleRejectChange(req)}
								>
									<XIcon class="size-3.5" />
								</Button>
							</div>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</section>

		<Separator.Root class="my-5" />

		<!-- Pool MJ -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold">Mon pool</h3>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						onclick={() =>
							goto(`/characters/new?campaignId=${campaignId}&pool=true`)}
					>
						<PlusIcon class="size-3.5" />
						Créer
					</Button>
					<Button
						size="sm"
						variant="outline"
						onclick={() => {
							importForPool = true;
							importOpen = true;
						}}
					>
						<UploadIcon class="size-3.5" />
						Importer
					</Button>
				</div>
			</div>

			{#if poolSheets.length === 0}
				<p class="text-muted-foreground text-sm">Le pool est vide.</p>
			{:else}
				<div class="space-y-2">
					{#each poolSheets as ps (ps.id)}
						<Card.Root class="gap-2 p-4">
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium">{ps.name}</p>
								<div class="flex items-center gap-2">
									{#if ps.pendingRequestCount > 0}
										<Badge variant="secondary">
											{ps.pendingRequestCount} demande{ps.pendingRequestCount >
											1
												? "s"
												: ""}
										</Badge>
									{/if}
									<Button
										size="sm"
										variant="ghost"
										onclick={() => handleToggleVisibility(ps)}
										title={ps.visibleToPlayers
											? "Masquer aux joueurs"
											: "Rendre visible"}
									>
										{#if ps.visibleToPlayers}
											<EyeIcon class="size-4" />
										{:else}
											<EyeOffIcon class="size-4 text-muted-foreground" />
										{/if}
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onclick={() => handleDeletePoolSheet(ps.id)}
									>
										<Trash2Icon class="text-destructive size-4" />
									</Button>
								</div>
							</div>

							<!-- Demandes sur cette fiche -->
							{#each poolRequests.filter((r) => r.poolSheetId === ps.id) as req (req.id)}
								<div
									class="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
								>
									<span
										>Joueur {req.requestedByUserId.slice(0, 8)}… demande cette
										fiche</span
									>
									<div class="flex gap-2">
										<Button size="sm" onclick={() => handleConfirmPool(req)}>
											<CheckIcon class="size-3.5" />
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onclick={() => handleRejectPool(req)}
										>
											<XIcon class="size-3.5" />
										</Button>
									</div>
								</div>
							{/each}
						</Card.Root>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
{/if}

<!-- Modals -->
<ImportSheetModal
	bind:open={importOpen}
	title={importForPool ? "Importer dans le pool" : "Importer dans la campagne"}
	onClose={() => (importOpen = false)}
	onSelect={handleImport}
/>

{#if activateDialogSheet}
	<ActivateSheetDialog
		bind:open={
			() => activateDialogSheet !== null,
			(v) => {
				if (!v) activateDialogSheet = null;
			}
		}
		sheetName={activateDialogSheet.name}
		onConfirm={() => handleActivate(activateDialogSheet!)}
		onCancel={() => (activateDialogSheet = null)}
	/>
{/if}

<Sheet.Root
	open={viewSheetId !== null}
	onOpenChange={(v) => {
		if (!v) viewSheetId = null;
	}}
>
	<Sheet.Content side="right" class="w-full sm:max-w-2xl overflow-y-auto p-0">
		{#if viewSheetId}
			<CharacterSheetViewer sheetId={viewSheetId} />
		{/if}
	</Sheet.Content>
</Sheet.Root>
