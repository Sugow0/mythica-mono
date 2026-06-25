<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { page } from "$app/state";
	import VttCanvas from "$lib/vtt/VttCanvas.svelte";
	import VttToolbar from "$lib/vtt/panels/VttToolbar.svelte";
	import VttInitiativePanel from "$lib/vtt/panels/VttInitiativePanel.svelte";
	import VttChatPanel from "$lib/vtt/panels/VttChatPanel.svelte";
	import VttPresenceBar from "$lib/vtt/panels/VttPresenceBar.svelte";
	import VttFogControls from "$lib/vtt/panels/VttFogControls.svelte";
	import VttMapPanel from "$lib/vtt/panels/VttMapPanel.svelte";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import { VttWebSocket, type WsStatus } from "$lib/vtt/ws/VttWebSocket";
	import { campaignService } from "$lib/index.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const sessionId = page.params.id ?? "";
	const isOwner = $derived(data.campaign?.ownerId === data.user?.id);
	const myRole = $derived(
		data.members?.find((m) => m.userId === data.user?.id)?.role ?? null
	);
	const isGm = $derived(isOwner || myRole === "gm");

	let ws = $state<VttWebSocket | null>(null);
	let wsStatus = $state<WsStatus>("connecting");
	let showMaps = $state(false);

	$effect(() => {
		vttState.setIsGm(isGm);
	});

	async function handleAddToken(label: string) {
		try {
			await campaignService.createToken(sessionId, { label });
		} catch {
			// Le token s'affichera via l'événement WS TOKEN_ADDED
		}
	}

	function handleFogPaint(polygon: { x: number; y: number }[]) {
		if (polygon.length === 0) {
			// fog-erase : tout masquer
			ws?.send({ type: "FOG_CLEAR" });
		} else {
			// Ajouter le rectangle aux zones révélées existantes
			const currentRevealed = vttState.fog.revealed;
			ws?.send({ type: "FOG_PAINT", polygons: [...currentRevealed, polygon] });
		}
	}

	onMount(() => {
		const instance = new VttWebSocket(sessionId, vttState);
		instance.onStatusChange = (s) => (wsStatus = s);
		instance.connect();
		ws = instance;
	});

	onDestroy(() => {
		ws?.disconnect();
	});
</script>

<svelte:head>
	<title>{data.session?.nom ?? "Table"} — Mythica</title>
</svelte:head>

<div
	class="fixed inset-0 overflow-hidden bg-slate-950"
	style="font-family: 'Public Sans', sans-serif"
>
	<!-- Canvas PixiJS fullscreen -->
	<div class="absolute inset-0">
		<VttCanvas
			mapConfig={vttState.activeMap}
			onTokenMove={(id, x, y) =>
				ws?.send({ type: "TOKEN_MOVE", tokenId: id, x, y })}
			onFogPaint={isGm ? handleFogPaint : undefined}
		/>
	</div>

	<!-- Indicateur WS (debug) -->
	<div
		class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs {wsStatus ===
		'open'
			? 'bg-green-900/80 text-green-300'
			: wsStatus === 'connecting'
				? 'bg-slate-800/80 text-slate-400'
				: 'bg-red-900/80 text-red-300'}"
	>
		<span
			class="h-2 w-2 rounded-full {wsStatus === 'open'
				? 'bg-green-400'
				: wsStatus === 'connecting'
					? 'bg-yellow-400 animate-pulse'
					: 'bg-red-400'}"
		></span>
		WS {wsStatus}
	</div>

	<!-- Overlays DOM -->
	<VttPresenceBar participants={vttState.participants} />
	<VttToolbar
		{isGm}
		{ws}
		onAddToken={isGm ? handleAddToken : undefined}
		onToggleMaps={isGm ? () => (showMaps = !showMaps) : undefined}
		{showMaps}
	/>
	{#if isGm && showMaps}
		<VttMapPanel campaignId={data.campaign?.id ?? ""} {sessionId} />
	{/if}
	{#if vttState.combatState.started}
		<VttInitiativePanel combatState={vttState.combatState} {isGm} {ws} />
	{/if}
	{#if isGm}
		<VttFogControls {ws} />
	{/if}
	<VttChatPanel {sessionId} campaignId={data.campaign?.id ?? ""} />
</div>
