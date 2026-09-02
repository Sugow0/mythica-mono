<script lang="ts">
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import UsersIcon from "@lucide/svelte/icons/users";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { Button } from "$lib/components/ui/button";
	import { campaignService } from "$lib/api/services/campaign-service";
	import { encountersService } from "$lib/api/services/encounters-service";
	import {
		campaignCharacterSheetsService,
		type CampaignPoolSheet,
	} from "$lib/api/services/campaign-character-sheets-service";
	import CreateQuickNpcModal from "./CreateQuickNpcModal.svelte";

	let {
		campaignId,
		gameSystemId,
		activeSessionId,
	}: {
		campaignId: string;
		gameSystemId: string;
		activeSessionId: string | null;
	} = $props();

	let poolSheets = $state<CampaignPoolSheet[]>([]);
	let encounters = $state<any[]>([]);
	let activeEncounterId = $state<string | null>(null);
	let newEncounterName = $state("");

	let showNpcModal = $state(false);

	let loading = $state(true);
	let deployBusy = $state(false);
	let deploySuccess = $state(false);
	let deployError = $state<string | null>(null);

	const activeEncounter = $derived(
		encounters.find((e) => e.id === activeEncounterId)
	);

	async function loadData() {
		loading = true;
		try {
			const [pool, encData] = await Promise.all([
				campaignCharacterSheetsService.getPool(campaignId),
				encountersService.getEncounters(campaignId),
			]);
			poolSheets = pool;
			encounters = encData.items || [];
			if (encounters.length > 0 && !activeEncounterId) {
				activeEncounterId = encounters[0].id;
			}
		} catch (e) {
			console.error("Failed to load encounters", e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadData();
	});

	async function handleCreateEncounter() {
		if (!newEncounterName.trim()) return;
		try {
			const res = await encountersService.createEncounter(campaignId, {
				nom: newEncounterName,
			});
			newEncounterName = "";
			await loadData();
			activeEncounterId = res.id;
		} catch (e) {
			console.error(e);
		}
	}

	async function handleDeleteEncounter(id: string) {
		try {
			await encountersService.deleteEncounter(campaignId, id);
			if (activeEncounterId === id) activeEncounterId = null;
			await loadData();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleAddMonster(sheetId: string) {
		if (!activeEncounterId) return;
		try {
			await encountersService.addMonster(campaignId, activeEncounterId, {
				characterSheetId: sheetId,
				quantity: 1,
			});
			await loadData();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleRemoveMonster(monsterId: string) {
		if (!activeEncounterId) return;
		try {
			await encountersService.removeMonster(
				campaignId,
				activeEncounterId,
				monsterId
			);
			await loadData();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleDeploy() {
		if (!activeEncounterId || !activeSessionId) return;
		deployBusy = true;
		deploySuccess = false;
		deployError = null;
		try {
			await campaignService.deployEncounter(activeSessionId, activeEncounterId);
			deploySuccess = true;
			setTimeout(() => (deploySuccess = false), 3000);
		} catch (e: any) {
			console.error(e);
			deployError = e.message || "Erreur de déploiement";
			setTimeout(() => (deployError = null), 5000);
		} finally {
			deployBusy = false;
		}
	}
</script>

<div class="grid gap-6 lg:grid-cols-12">
	<!-- Sidebar: Encounters List -->
	<div class="lg:col-span-3 space-y-6">
		<div
			class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card"
		>
			<h2
				class="mb-4 font-bold flex items-center gap-2 text-slate-900 dark:text-white"
			>
				<ShieldIcon class="h-5 w-5 text-red-500" />
				Mes rencontres
			</h2>

			<div class="space-y-2 mb-4">
				{#if encounters.length === 0}
					<p class="text-sm text-slate-500">Aucune rencontre créée.</p>
				{:else}
					{#each encounters as enc}
						<div class="flex items-center gap-2">
							<button
								class="flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors {activeEncounterId ===
								enc.id
									? 'bg-red-50 text-red-700 font-medium dark:bg-red-950/30 dark:text-red-400'
									: 'hover:bg-slate-50 dark:hover:bg-muted text-slate-700 dark:text-slate-300'}"
								onclick={() => (activeEncounterId = enc.id)}
							>
								{enc.nom}
							</button>
							<button
								class="text-slate-400 hover:text-red-500 p-2"
								onclick={() => handleDeleteEncounter(enc.id)}
							>
								<Trash2Icon class="w-4 h-4" />
							</button>
						</div>
					{/each}
				{/if}
			</div>

			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newEncounterName}
					placeholder="Nouvelle rencontre..."
					class="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-red-500 dark:border-border dark:bg-background"
				/>
				<Button size="icon" variant="outline" onclick={handleCreateEncounter}>
					<PlusIcon class="w-4 h-4" />
				</Button>
			</div>
		</div>
	</div>

	<!-- Encounter Builder Workspace -->
	<div class="lg:col-span-9">
		<div
			class="flex h-[600px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card overflow-hidden"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-border/50 dark:bg-muted/50"
			>
				<h2
					class="font-bold text-slate-900 dark:text-white flex items-center gap-2"
				>
					<SwordsIcon class="h-5 w-5 text-slate-400" />
					{activeEncounter ? activeEncounter.nom : "Sélectionnez une rencontre"}
				</h2>
			</div>

			{#if activeEncounter}
				<div
					class="flex flex-1 divide-x divide-slate-100 dark:divide-border/50"
				>
					<!-- Bestiary -->
					<div
						class="flex-1 overflow-y-auto bg-slate-50/50 p-4 dark:bg-transparent"
					>
						<h3 class="mb-4 text-sm font-semibold text-slate-500">
							Pool MJ (Cliquez pour ajouter)
						</h3>
						<div class="space-y-2">
							{#each poolSheets as sheet}
								<button
									class="w-full group flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-red-300 hover:shadow-md dark:border-border dark:bg-background"
									onclick={() => handleAddMonster(sheet.characterSheetId)}
								>
									<div>
										<div
											class="font-medium text-slate-900 dark:text-white group-hover:text-red-600 transition-colors"
										>
											{sheet.name}
										</div>
									</div>
									<PlusIcon
										class="w-4 h-4 text-slate-300 group-hover:text-red-500"
									/>
								</button>
							{/each}
						</div>
					</div>

					<!-- Current Encounter -->
					<div
						class="flex-1 overflow-y-auto p-4 bg-red-50/30 dark:bg-red-950/5"
					>
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-sm font-semibold text-slate-900 dark:text-white">
								Monstres de la rencontre
							</h3>
							<Button
								size="sm"
								variant="outline"
								class="h-8 text-xs bg-white dark:bg-background"
								onclick={() => (showNpcModal = true)}
							>
								Créer PNJ rapide
							</Button>
						</div>

						{#if activeEncounter.monsters.length === 0}
							<div
								class="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-12 text-center dark:border-border"
							>
								<SwordsIcon class="mb-3 h-8 w-8 text-slate-400" />
								<span
									class="text-sm font-medium text-slate-600 dark:text-slate-400"
									>Ajoutez des monstres depuis le Pool MJ</span
								>
							</div>
						{:else}
							<div class="space-y-2">
								{#each activeEncounter.monsters as monster}
									<div
										class="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-white p-3 shadow-sm dark:border-red-900/30 dark:bg-card"
									>
										<div class="flex items-center gap-3">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 font-bold text-red-700 dark:bg-red-900/50 dark:text-red-400"
											>
												{monster.quantity}
											</div>
											<div>
												<div class="font-medium text-slate-900 dark:text-white">
													{monster.name}
												</div>
											</div>
										</div>
										<button
											class="text-slate-400 hover:text-red-600"
											onclick={() => handleRemoveMonster(monster.id)}>×</button
										>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Footer Actions -->
				<div
					class="border-t border-slate-100 bg-white px-6 py-4 dark:border-border/50 dark:bg-card flex justify-end gap-3 items-center"
				>
					{#if deployError}
						<span class="text-sm text-red-500 mr-auto">{deployError}</span>
					{/if}
					{#if deploySuccess}
						<span
							class="text-sm text-green-500 mr-auto flex items-center gap-1"
						>
							<ShieldIcon class="w-4 h-4" /> Déployé avec succès
						</span>
					{/if}

					<Button
						class="bg-red-600 hover:bg-red-700 text-white transition-all"
						disabled={!activeSessionId ||
							deployBusy ||
							activeEncounter.monsters.length === 0}
						onclick={handleDeploy}
					>
						{deployBusy
							? "Déploiement..."
							: activeSessionId
								? "Déployer sur la session active"
								: "Aucune session active"}
					</Button>
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center text-slate-400">
					<p>Créez ou sélectionnez une rencontre pour commencer.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

{#if showNpcModal}
	<CreateQuickNpcModal
		bind:open={showNpcModal}
		{campaignId}
		{gameSystemId}
		onClose={() => (showNpcModal = false)}
		onCreated={() => loadData()}
	/>
{/if}
