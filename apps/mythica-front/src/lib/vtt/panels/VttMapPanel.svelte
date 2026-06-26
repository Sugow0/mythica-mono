<script lang="ts">
	import MapIcon from "@lucide/svelte/icons/map";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import CheckIcon from "@lucide/svelte/icons/check";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import XIcon from "@lucide/svelte/icons/x";
	import { onMount } from "svelte";
	import { campaignService } from "$lib/index.js";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import VttMapEditModal from "./VttMapEditModal.svelte";

	let { campaignId, sessionId }: { campaignId: string; sessionId: string } =
		$props();

	type MapItem = {
		id: string;
		nom: string;
		gridType: string;
		gridSize: number;
		widthPx: number;
		heightPx: number;
		gridOffsetX: number;
		gridOffsetY: number;
		gridColor: string;
		gridOpacity: number;
	};

	let maps = $state<MapItem[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let showCreate = $state(false);
	let newName = $state("");
	let newGridType = $state<"square" | "hex" | "free">("square");
	let busy = $state(false);

	let editMap = $state<MapItem | null>(null);
	let showEdit = $state(false);

	const activeMapId = $derived(vttState.activeMap?.id ?? null);

	async function loadMaps() {
		loading = true;
		error = null;
		try {
			const result = await campaignService.getMaps(campaignId);
			maps = (result?.maps ?? []) as MapItem[];
		} catch {
			error = "Impossible de charger les maps.";
		} finally {
			loading = false;
		}
	}

	async function createMap() {
		if (!newName.trim()) return;
		busy = true;
		try {
			await campaignService.createMap(campaignId, {
				nom: newName.trim(),
				gridType: newGridType,
			});
			newName = "";
			showCreate = false;
			await loadMaps();
		} catch {
			error = "Erreur lors de la création.";
		} finally {
			busy = false;
		}
	}

	async function activateMap(mapId: string) {
		busy = true;
		try {
			await campaignService.activateMap(sessionId, mapId);
		} catch {
			error = "Erreur lors de l'activation.";
		} finally {
			busy = false;
		}
	}

	async function deactivateMap() {
		busy = true;
		try {
			await campaignService.activateMap(sessionId, null);
		} catch {
			error = "Erreur lors de la désactivation.";
		} finally {
			busy = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") createMap();
		if (e.key === "Escape") showCreate = false;
	}

	onMount(loadMaps);
</script>

<div
	class="fixed left-4 top-16 z-50 w-64 rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
>
	<!-- Header -->
	<div
		class="flex items-center justify-between border-b border-slate-700 px-3 py-2"
	>
		<div
			class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300"
		>
			<MapIcon class="h-3.5 w-3.5" />
			Maps
		</div>
		<button
			onclick={() => (showCreate = !showCreate)}
			class="rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-white"
			title="Nouvelle map"
		>
			<PlusIcon class="h-4 w-4" />
		</button>
	</div>

	<!-- Formulaire création -->
	{#if showCreate}
		<div class="border-b border-slate-700 p-3 space-y-2">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={newName}
				onkeydown={onKeydown}
				placeholder="Nom de la map…"
				autofocus
				class="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-600"
			/>
			<select
				bind:value={newGridType}
				class="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600"
			>
				<option value="square">Grille carrée</option>
				<option value="hex">Grille hexagonale</option>
				<option value="free">Sans grille</option>
			</select>
			<div class="flex gap-2">
				<button
					onclick={createMap}
					disabled={busy || !newName.trim()}
					class="flex flex-1 items-center justify-center gap-1 rounded bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
				>
					<CheckIcon class="h-3.5 w-3.5" />
					Créer
				</button>
				<button
					onclick={() => (showCreate = false)}
					class="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
				>
					<XIcon class="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Erreur -->
	{#if error}
		<p class="px-3 py-2 text-xs text-red-400">{error}</p>
	{/if}

	<!-- Liste des maps -->
	<div class="max-h-64 overflow-y-auto py-1">
		{#if loading}
			<p class="px-3 py-4 text-center text-xs text-slate-500">Chargement…</p>
		{:else if maps.length === 0}
			<p class="px-3 py-4 text-center text-xs text-slate-500">
				Aucune map. Créez-en une ci-dessus.
			</p>
		{:else}
			{#each maps as map (map.id)}
				{@const isActive = map.id === activeMapId}
				<div
					class="flex items-center gap-2 px-3 py-2 {isActive
						? 'bg-red-600/15'
						: 'hover:bg-slate-800'}"
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium text-slate-200">{map.nom}</p>
						<p class="text-[10px] text-slate-500">
							{map.gridType} · {map.gridSize}px
						</p>
					</div>
					<div class="flex items-center gap-1 shrink-0">
						<button
							onclick={() => {
								editMap = map;
								showEdit = true;
							}}
							disabled={busy}
							class="rounded p-1 text-slate-400 hover:text-white"
							title="Modifier la map"
						>
							<SettingsIcon class="h-3.5 w-3.5" />
						</button>
						{#if isActive}
							<button
								onclick={deactivateMap}
								disabled={busy}
								class="rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600 disabled:opacity-40"
							>
								Désactiver
							</button>
						{:else}
							<button
								onclick={() => activateMap(map.id)}
								disabled={busy}
								class="rounded bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-40"
							>
								Activer
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<VttMapEditModal
	map={editMap}
	{campaignId}
	open={showEdit}
	onOpenChange={(o) => (showEdit = o)}
	onSuccess={async () => {
		await loadMaps();
		if (editMap && editMap.id === activeMapId) {
			await activateMap(editMap.id);
		}
	}}
/>
