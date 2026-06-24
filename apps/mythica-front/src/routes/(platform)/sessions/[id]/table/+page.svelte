<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { page } from "$app/state";
	import VttCanvas from "$lib/vtt/VttCanvas.svelte";
	import VttToolbar from "$lib/vtt/panels/VttToolbar.svelte";
	import VttInitiativePanel from "$lib/vtt/panels/VttInitiativePanel.svelte";
	import VttChatPanel from "$lib/vtt/panels/VttChatPanel.svelte";
	import VttPresenceBar from "$lib/vtt/panels/VttPresenceBar.svelte";
	import VttFogControls from "$lib/vtt/panels/VttFogControls.svelte";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const sessionId = page.params.id ?? "";
	const isOwner = $derived(data.campaign?.ownerId === data.user?.id);
	const myRole = $derived(
		data.members?.find((m) => m.userId === data.user?.id)?.role ?? null
	);
	const isGm = $derived(isOwner || myRole === "gm");

	let ws = $state<VttWebSocket | null>(null);

	$effect(() => {
		vttState.setIsGm(isGm);
	});

	onMount(() => {
		ws = new VttWebSocket(sessionId, vttState);
		ws.connect();
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
		/>
	</div>

	<!-- Overlays DOM -->
	<VttPresenceBar participants={vttState.participants} />
	<VttToolbar {isGm} {ws} />
	{#if vttState.combatState.started}
		<VttInitiativePanel combatState={vttState.combatState} {isGm} {ws} />
	{/if}
	{#if isGm}
		<VttFogControls {ws} />
	{/if}
	<VttChatPanel {sessionId} campaignId={data.campaign?.id ?? ""} />
</div>
