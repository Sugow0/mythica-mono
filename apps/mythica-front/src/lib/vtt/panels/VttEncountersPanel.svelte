<script lang="ts">
	import XIcon from "@lucide/svelte/icons/x";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import { encountersService } from "$lib/api/services/encounters-service";
	import { campaignService } from "$lib/api/services/campaign-service";

	let {
		campaignId,
		sessionId,
		onClose,
	}: {
		campaignId: string;
		sessionId: string;
		onClose: () => void;
	} = $props();

	type Encounter = NonNullable<
		Awaited<ReturnType<typeof encountersService.getEncounters>>
	>["items"][number];

	let encounters = $state<Encounter[]>([]);
	let loading = $state(true);
	let deployingId = $state<string | null>(null);
	let deployedId = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		try {
			const res = await encountersService.getEncounters(campaignId);
			encounters = res.items || [];
		} catch (e) {
			console.error("Failed to load encounters", e);
		} finally {
			loading = false;
		}
	}

	load();

	async function handleDeploy(encounterId: string) {
		deployingId = encounterId;
		error = null;
		try {
			await campaignService.deployEncounter(sessionId, encounterId);
			deployedId = encounterId;
			setTimeout(() => (deployedId = null), 3000);
		} catch (e) {
			error = e instanceof Error ? e.message : "Erreur de déploiement";
			setTimeout(() => (error = null), 5000);
		} finally {
			deployingId = null;
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
				<SwordsIcon class="h-4 w-4" />
			</div>
			<h2 class="text-sm font-medium tracking-tight text-foreground">
				Rencontres
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
		{#if error}
			<p class="text-xs text-red-500 bg-red-500/10 rounded-lg p-2">{error}</p>
		{/if}
		{#if loading}
			<p class="text-sm text-muted-foreground text-center py-6">Chargement…</p>
		{:else if encounters.length === 0}
			<div
				class="flex h-32 flex-col items-center justify-center gap-2 text-center text-muted-foreground"
			>
				<SwordsIcon class="h-8 w-8 opacity-20" />
				<p class="text-sm">
					Aucune rencontre préparée.<br />Créez-en une depuis la page de la
					campagne.
				</p>
			</div>
		{:else}
			{#each encounters as enc (enc.id)}
				<div
					class="flex items-center justify-between gap-3 rounded-[1rem] border border-border/20 bg-secondary/40 p-2.5"
				>
					<div class="flex flex-1 flex-col overflow-hidden">
						<span class="truncate text-sm font-medium text-foreground"
							>{enc.nom}</span
						>
						<span class="text-xs text-muted-foreground">
							{enc.monsters.length}
							{enc.monsters.length > 1 ? "monstres" : "monstre"}
						</span>
					</div>
					<button
						disabled={deployingId === enc.id || enc.monsters.length === 0}
						onclick={() => handleDeploy(enc.id)}
						class="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-red-700 disabled:pointer-events-none disabled:opacity-40"
					>
						{deployingId === enc.id
							? "…"
							: deployedId === enc.id
								? "Déployé ✓"
								: "Déployer"}
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>
