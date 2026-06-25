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
		class="flex gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur"
	>
		{#each tools as tool (tool.id)}
			<button
				onclick={() => vttState.setTool(tool.id)}
				class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {vttState.selectedToolId ===
				tool.id
					? 'bg-red-600 text-white'
					: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
				title={tool.label}
			>
				<tool.icon class="h-4 w-4" />
				<span>{tool.label}</span>
			</button>
		{/each}

		{#if isGm}
			<div class="mx-0.5 w-px bg-slate-700"></div>
			<button
				onclick={() => (showAddToken = !showAddToken)}
				class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {showAddToken
					? 'bg-red-600 text-white'
					: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
				title="Ajouter un token"
			>
				<PlusCircleIcon class="h-4 w-4" />
				<span>Token</span>
			</button>
			<button
				onclick={onToggleMaps}
				class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {showMaps
					? 'bg-red-600 text-white'
					: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
				title="Gérer les maps"
			>
				<MapIcon class="h-4 w-4" />
				<span>Maps</span>
			</button>
			<button
				onclick={onToggleActors}
				class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {showActors
					? 'bg-red-600 text-white'
					: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
				title="Ouvrir la bibliothèque d'acteurs"
			>
				<UsersIcon class="h-4 w-4" />
				<span>Acteurs</span>
			</button>
		{/if}

		<div class="mx-0.5 w-px bg-slate-700"></div>
		<button
			onclick={onToggleMySheet}
			class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {showMySheet
				? 'bg-red-600 text-white'
				: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
			title="Ma Fiche de Personnage"
		>
			<UserIcon class="h-4 w-4" />
			<span>Ma Fiche</span>
		</button>
		<button
			onclick={onToggleDice}
			class="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors {showDice
				? 'bg-red-600 text-white'
				: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
			title="Lancer les dés"
		>
			<DicesIcon class="h-4 w-4" />
			<span>Dés</span>
		</button>
	</div>

	{#if showAddToken}
		<div
			class="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur"
		>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={tokenLabel}
				onkeydown={onKeydown}
				placeholder="Nom du token…"
				autofocus
				class="w-40 rounded bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-600"
			/>
			<button
				onclick={submitAddToken}
				disabled={!tokenLabel.trim()}
				class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-40"
			>
				Placer
			</button>
		</div>
	{/if}
</div>
