<script lang="ts">
	import EraserIcon from "@lucide/svelte/icons/eraser";
	import MapIcon from "@lucide/svelte/icons/map";
	import MousePointer2Icon from "@lucide/svelte/icons/mouse-pointer-2";
	import MoveIcon from "@lucide/svelte/icons/move";
	import PlusCircleIcon from "@lucide/svelte/icons/plus-circle";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import UserIcon from "@lucide/svelte/icons/user";
	import UsersIcon from "@lucide/svelte/icons/users";
	import DicesIcon from "@lucide/svelte/icons/dices";
	import { vttState } from "$lib/vtt/vtt.svelte";
	import type { VttWebSocket } from "$lib/vtt/ws/VttWebSocket";

	let {
		isGm,
		ws: _ws,
		onAddToken,
		onToggleMaps,
		showMaps = false,
		onToggleActors,
		showActors = false,
		onToggleMySheet,
		showMySheet = false,
		onToggleDice,
		showDice = false,
	}: {
		isGm: boolean;
		ws: VttWebSocket | null;
		onAddToken?: (label: string) => void;
		onToggleMaps?: () => void;
		showMaps?: boolean;
		onToggleActors?: () => void;
		showActors?: boolean;
		onToggleMySheet?: () => void;
		showMySheet?: boolean;
		onToggleDice?: () => void;
		showDice?: boolean;
	} = $props();

	const gmTools = [
		{ id: "select" as const, icon: MousePointer2Icon, label: "Sélectionner" },
		{ id: "move" as const, icon: MoveIcon, label: "Déplacer" },
		{ id: "fog-paint" as const, icon: PlusIcon, label: "Reveal" },
		{ id: "fog-erase" as const, icon: EraserIcon, label: "Hide" },
	];

	const playerTools = [
		{ id: "select" as const, icon: MousePointer2Icon, label: "Sélectionner" },
	];

	const tools = $derived(isGm ? gmTools : playerTools);

	let showAddToken = $state(false);
	let tokenLabel = $state("");

	function submitAddToken() {
		if (!tokenLabel.trim()) return;
		onAddToken?.(tokenLabel.trim());
		tokenLabel = "";
		showAddToken = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submitAddToken();
		if (e.key === "Escape") {
			showAddToken = false;
			tokenLabel = "";
		}
	}
</script>

<div
	class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
>
	<div
		class="flex gap-1.5 rounded-2xl border border-slate-700/50 bg-slate-900/80 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-md transition-all hover:bg-slate-900/90 hover:border-slate-600/50"
	>
		{#each tools as tool (tool.id)}
			<button
				onclick={() => vttState.setTool(tool.id)}
				class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 {vttState.selectedToolId ===
				tool.id
					? 'bg-crimson-600/90 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] ring-1 ring-crimson-500'
					: 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}"
				title={tool.label}
			>
				<tool.icon class="h-4 w-4" />
				<span>{tool.label}</span>
			</button>
		{/each}

		{#if isGm}
			<div class="mx-1 w-px rounded-full bg-slate-700/50"></div>
			<button
				onclick={() => (showAddToken = !showAddToken)}
				class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 {showAddToken
					? 'bg-crimson-600/90 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] ring-1 ring-crimson-500'
					: 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}"
				title="Ajouter un token"
			>
				<PlusCircleIcon class="h-4 w-4" />
				<span>Token</span>
			</button>
			<button
				onclick={onToggleMaps}
				class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 {showMaps
					? 'bg-crimson-600/90 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] ring-1 ring-crimson-500'
					: 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}"
				title="Gérer les maps"
			>
				<MapIcon class="h-4 w-4" />
				<span>Maps</span>
			</button>
			<button
				onclick={onToggleActors}
				class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 {showActors
					? 'bg-crimson-600/90 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] ring-1 ring-crimson-500'
					: 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}"
				title="Ouvrir la bibliothèque d'acteurs"
			>
				<UsersIcon class="h-4 w-4" />
				<span>Acteurs</span>
			</button>
		{/if}

		<div class="mx-1 w-px rounded-full bg-slate-700/50"></div>
		<button
			onclick={onToggleMySheet}
			class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 {showMySheet
				? 'bg-crimson-600/90 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] ring-1 ring-crimson-500'
				: 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}"
			title="Ma Fiche de Personnage"
		>
			<UserIcon class="h-4 w-4" />
			<span>Ma Fiche</span>
		</button>
		<button
			onclick={onToggleDice}
			class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 {showDice
				? 'bg-crimson-600/90 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] ring-1 ring-crimson-500'
				: 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'}"
			title="Lancer les dés"
		>
			<DicesIcon class="h-4 w-4" />
			<span>Dés</span>
		</button>
	</div>

	{#if showAddToken}
		<div
			class="flex animate-in fade-in slide-in-from-top-2 items-center gap-2 rounded-2xl border border-slate-700/50 bg-slate-900/90 px-3 py-2 shadow-2xl backdrop-blur-md"
		>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={tokenLabel}
				onkeydown={onKeydown}
				placeholder="Nom du token…"
				autofocus
				class="w-40 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-crimson-500"
			/>
			<button
				onclick={submitAddToken}
				disabled={!tokenLabel.trim()}
				class="rounded-lg bg-crimson-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-crimson-500 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
			>
				Placer
			</button>
		</div>
	{/if}
</div>
