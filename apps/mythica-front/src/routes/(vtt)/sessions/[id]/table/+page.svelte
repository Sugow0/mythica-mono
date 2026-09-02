<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { page } from "$app/state";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import VttCanvas from "$lib/vtt/VttCanvas.svelte";
	import VttToolbar from "$lib/vtt/panels/VttToolbar.svelte";
	import VttChatPanel from "$lib/vtt/panels/VttChatPanel.svelte";
	import VttPresenceBar from "$lib/vtt/panels/VttPresenceBar.svelte";
	import VttTimelinePanel from "$lib/vtt/panels/VttTimelinePanel.svelte";
	import VttMapPanel from "$lib/vtt/panels/VttMapPanel.svelte";
	import VttCharacterSheetPanel from "$lib/vtt/panels/VttCharacterSheetPanel.svelte";
	import VttDiceRoller from "$lib/vtt/panels/VttDiceRoller.svelte";
	import VttQuickDicePanel from "$lib/vtt/panels/VttQuickDicePanel.svelte";
	import VttActorsPanel from "$lib/vtt/panels/VttActorsPanel.svelte";
	import VttEncountersPanel from "$lib/vtt/panels/VttEncountersPanel.svelte";
	import type { CampaignCharacterSheet } from "$lib/api/services/campaign-character-sheets-service";
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
	let showActors = $state(false);
	let showEncounters = $state(false);
	let showMySheet = $state(false);
	let openedSheetId = $state<string | null>(null);
	let showDice = $state(false);
	let openedSheetTokenId = $state<string | null>(null);

	const mySheetId = $derived(
		data.campaignSheets?.find(
			(s: CampaignCharacterSheet) =>
				s.userId === data.user?.id && s.status === "active"
		)?.characterSheetId
	);

	$effect(() => {
		vttState.setIsGm(isGm);
		vttState.setMyCharacterSheetId(mySheetId ?? null);
	});

	async function handleAddToken(label: string) {
		try {
			const res = await campaignService.createToken(sessionId, { label });
			if (res.success && res.token) {
				vttState.addToken(res.token);
			}
		} catch {
			// Ignore
		}
	}

	async function handleDropToken(
		sheetId: string,
		label: string,
		fileId: string | null,
		gridX: number,
		gridY: number
	) {
		if (!isGm) return;
		try {
			const res = await campaignService.createToken(sessionId, {
				label,
				characterSheetId: sheetId,
				fileId: fileId ?? undefined,
				posX: gridX,
				posY: gridY,
			});
			if (res.success && res.token) {
				vttState.addToken(res.token);
			}
		} catch (_err) {
			// Ignore
		}
	}

	type Point = { x: number; y: number };

	function handleFogPaint(polygon: Point[]) {
		const currentRevealed = vttState.fog.revealed;
		ws?.send({ type: "FOG_PAINT", polygons: [...currentRevealed, polygon] });
	}

	// Soustrait le rectangle `hide` de chaque polygone révélé existant.
	// Chaque rectangle révélé peut produire jusqu'à 4 sous-rectangles après soustraction.
	function handleFogHide(hide: Point[]) {
		if (hide.length < 4) return;
		const hx1 = Math.min(...hide.map((p) => p.x));
		const hx2 = Math.max(...hide.map((p) => p.x));
		const hy1 = Math.min(...hide.map((p) => p.y));
		const hy2 = Math.max(...hide.map((p) => p.y));

		const rect = (x1: number, y1: number, x2: number, y2: number): Point[] => [
			{ x: x1, y: y1 },
			{ x: x2, y: y1 },
			{ x: x2, y: y2 },
			{ x: x1, y: y2 },
		];

		const remaining: Point[][] = [];
		for (const poly of vttState.fog.revealed) {
			if (poly.length < 4) continue;
			const rx1 = Math.min(...poly.map((p) => p.x));
			const rx2 = Math.max(...poly.map((p) => p.x));
			const ry1 = Math.min(...poly.map((p) => p.y));
			const ry2 = Math.max(...poly.map((p) => p.y));

			// Pas de chevauchement : conserver intact
			if (rx2 <= hx1 || rx1 >= hx2 || ry2 <= hy1 || ry1 >= hy2) {
				remaining.push(poly);
				continue;
			}
			// Zone de chevauchement réelle
			const ox1 = Math.max(rx1, hx1);
			const ox2 = Math.min(rx2, hx2);
			const oy1 = Math.max(ry1, hy1);
			const oy2 = Math.min(ry2, hy2);
			// Bandes restantes autour du trou
			if (ry1 < oy1) remaining.push(rect(rx1, ry1, rx2, oy1)); // haut
			if (ry2 > oy2) remaining.push(rect(rx1, oy2, rx2, ry2)); // bas
			if (rx1 < ox1) remaining.push(rect(rx1, oy1, ox1, oy2)); // gauche
			if (rx2 > ox2) remaining.push(rect(ox2, oy1, rx2, oy2)); // droite
		}

		ws?.send({ type: "FOG_PAINT", polygons: remaining });
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
	class="fixed inset-0 overflow-hidden bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
	style="font-family: 'Public Sans', sans-serif"
>
	<!-- Canvas PixiJS fullscreen -->
	<div class="absolute inset-0">
		<VttCanvas
			mapConfig={vttState.activeMap}
			onTokenMove={(id, x, y, waypoints) =>
				ws?.send({ type: "TOKEN_MOVE", tokenId: id, x, y, waypoints })}
			onTokenDoubleClick={(id) => (openedSheetTokenId = id)}
			onDropToken={handleDropToken}
			onFogPaint={isGm ? handleFogPaint : undefined}
			onFogHide={isGm ? handleFogHide : undefined}
			onTokenDelete={isGm
				? (id) => ws?.send({ type: "TOKEN_REMOVE", tokenId: id })
				: undefined}
			onTokenUpdate={(id, updates) =>
				ws?.send({ type: "TOKEN_UPDATE", tokenId: id, ...updates })}
			onWallAdd={isGm
				? (p1X, p1Y, p2X, p2Y, type) =>
						ws?.send({ type: "WALL_ADD", p1X, p1Y, p2X, p2Y, wallType: type })
				: undefined}
			onWallRemove={isGm
				? (x, y) => {
						// On trouve le mur le plus proche de (x, y) (seuil 20 pixels)
						const wallId = vttState.walls.find((w) => {
							// Distance d'un point à un segment
							const l2 =
								(Number(w.p1X) - Number(w.p2X)) ** 2 +
								(Number(w.p1Y) - Number(w.p2Y)) ** 2;
							if (l2 === 0)
								return (
									(x - Number(w.p1X)) ** 2 + (y - Number(w.p1Y)) ** 2 < 400
								);
							let t =
								((x - Number(w.p1X)) * (Number(w.p2X) - Number(w.p1X)) +
									(y - Number(w.p1Y)) * (Number(w.p2Y) - Number(w.p1Y))) /
								l2;
							t = Math.max(0, Math.min(1, t));
							const dist2 =
								(x - (Number(w.p1X) + t * (Number(w.p2X) - Number(w.p1X)))) **
									2 +
								(y - (Number(w.p1Y) + t * (Number(w.p2Y) - Number(w.p1Y)))) **
									2;
							return dist2 < 400; // distance < 20 pixels
						})?.id;
						if (wallId) ws?.send({ type: "WALL_REMOVE", wallId });
					}
				: undefined}
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

	<!-- Bouton Quitter -->
	<a
		href="/campaigns/{data.campaign?.id}"
		class="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-sm font-medium text-muted-foreground shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-3xl transition-all hover:bg-red-500/10 hover:text-red-500 dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]"
		title="Quitter la session"
	>
		<LogOutIcon class="h-4 w-4" />
		<span class="hidden sm:inline">Quitter</span>
	</a>

	<!-- Overlays DOM -->
	<VttPresenceBar
		participants={vttState.participants}
		members={data.members}
		currentUserId={data.user?.id}
		onUpdateProfile={(profile) =>
			ws?.send({ type: "PRESENCE_UPDATE", ...profile })}
	/>
	<VttToolbar
		{isGm}
		{ws}
		onAddToken={isGm ? handleAddToken : undefined}
		onToggleMaps={isGm ? () => (showMaps = !showMaps) : undefined}
		{showMaps}
		onToggleActors={isGm ? () => (showActors = !showActors) : undefined}
		{showActors}
		onToggleEncounters={isGm
			? () => (showEncounters = !showEncounters)
			: undefined}
		{showEncounters}
		onToggleMySheet={() => {
			showMySheet = !showMySheet;
			if (showMySheet) vttState.setSelectedTokenId(null);
		}}
		{showMySheet}
		onToggleDice={() => (showDice = !showDice)}
		{showDice}
	/>
	{#if isGm && showMaps}
		<VttMapPanel campaignId={data.campaign?.id ?? ""} {sessionId} />
	{/if}
	{#if isGm && showActors}
		<VttActorsPanel
			campaignSheets={data.campaignSheets ?? []}
			onClose={() => (showActors = false)}
			onOpenSheet={(sheetId) => {
				openedSheetId = sheetId;
				openedSheetTokenId = null;
				showMySheet = false;
			}}
		/>
	{/if}
	{#if isGm && showEncounters}
		<VttEncountersPanel
			campaignId={data.campaign?.id ?? ""}
			{sessionId}
			onClose={() => (showEncounters = false)}
		/>
	{/if}
	{#if vttState.combatState.started}
		<VttTimelinePanel combatState={vttState.combatState} {isGm} {ws} />
	{/if}
	<VttDiceRoller />
	{#if showDice}
		<VttQuickDicePanel
			{ws}
			campaignId={data.campaign?.id ?? ""}
			onClose={() => (showDice = false)}
		/>
	{/if}
	<VttCharacterSheetPanel
		{ws}
		campaignId={data.campaign?.id ?? ""}
		sheetId={openedSheetId ?? (showMySheet ? (mySheetId ?? null) : undefined)}
		tokenId={openedSheetTokenId}
		onClose={() => {
			showMySheet = false;
			openedSheetId = null;
			openedSheetTokenId = null;
		}}
	/>
	<VttChatPanel {sessionId} campaignId={data.campaign?.id ?? ""} />
</div>
