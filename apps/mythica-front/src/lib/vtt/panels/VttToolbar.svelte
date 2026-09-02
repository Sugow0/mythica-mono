<script lang="ts">
	import EraserIcon from "@lucide/svelte/icons/eraser";
	import MapIcon from "@lucide/svelte/icons/map";
	import MousePointer2Icon from "@lucide/svelte/icons/mouse-pointer-2";
	import MoveIcon from "@lucide/svelte/icons/move";
	import RulerIcon from "@lucide/svelte/icons/ruler";
	import PlusCircleIcon from "@lucide/svelte/icons/plus-circle";
	import UserIcon from "@lucide/svelte/icons/user";
	import UsersIcon from "@lucide/svelte/icons/users";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import DicesIcon from "@lucide/svelte/icons/dices";
	import PenLineIcon from "@lucide/svelte/icons/pen-line";
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
		onToggleEncounters,
		showEncounters = false,
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
		onToggleEncounters?: () => void;
		showEncounters?: boolean;
		onToggleMySheet?: () => void;
		showMySheet?: boolean;
		onToggleDice?: () => void;
		showDice?: boolean;
	} = $props();

	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import PaintbrushIcon from "@lucide/svelte/icons/paintbrush";
	import CrosshairIcon from "@lucide/svelte/icons/crosshair";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import BricksIcon from "@lucide/svelte/icons/brick-wall";

	const categories = [
		{ id: "general", icon: MousePointer2Icon, label: "Général" },
		{ id: "walls", icon: BricksIcon, label: "Murs" },
		{ id: "fog", icon: EyeIcon, label: "Brouillard" },
	] as const;

	const gmTools = {
		general: [
			{ id: "select" as const, icon: MousePointer2Icon, label: "Sélectionner" },
			{ id: "move" as const, icon: MoveIcon, label: "Déplacer vue" },
			{ id: "ruler" as const, icon: RulerIcon, label: "Règle de mesure" },
		],
		walls: [
			{ id: "wall-add" as const, icon: PenLineIcon, label: "Ajouter mur" },
			{
				id: "wall-move" as const,
				icon: CrosshairIcon,
				label: "Déplacer point",
			},
			{ id: "wall-remove" as const, icon: Trash2Icon, label: "Supprimer mur" },
		],
		fog: [
			{ id: "fog-paint" as const, icon: PaintbrushIcon, label: "Révéler" },
			{ id: "fog-erase" as const, icon: EraserIcon, label: "Cacher" },
		],
	};

	const playerTools = [
		{ id: "select" as const, icon: MousePointer2Icon, label: "Sélectionner" },
		{ id: "ruler" as const, icon: RulerIcon, label: "Règle de mesure" },
	];

	let activeCategory = $state<"general" | "walls" | "fog">("general");

	$effect(() => {
		if (isGm) {
			if (["select", "move", "ruler"].includes(vttState.selectedToolId))
				activeCategory = "general";
			if (
				["wall-add", "wall-move", "wall-remove"].includes(
					vttState.selectedToolId
				)
			)
				activeCategory = "walls";
			if (["fog-paint", "fog-erase"].includes(vttState.selectedToolId))
				activeCategory = "fog";
		}
	});

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
	class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-3 transition-all"
>
	{#if isGm}
		<!-- Catégories principales -->
		<div
			class="flex gap-1.5 rounded-2xl border border-border/40 bg-background/70 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl"
		>
			{#each categories as cat (cat.id)}
				<button
					onclick={() => {
						activeCategory = cat.id;
						vttState.setTool(gmTools[cat.id][0].id);
					}}
					class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300 active:scale-95 {activeCategory ===
					cat.id
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
					title={cat.label}
				>
					<cat.icon class="h-4 w-4" />
					<span class="hidden sm:inline">{cat.label}</span>
				</button>
			{/each}

			<div class="mx-2 w-px rounded-full bg-border/50"></div>

			<button
				onclick={() => {
					showAddToken = true;
				}}
				class="flex items-center justify-center rounded-xl px-3 py-2 text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
				title="Ajouter un token personnalisé"
			>
				<PlusCircleIcon class="h-4 w-4" />
			</button>
		</div>

		<!-- Sous-outils -->
		<div
			class="flex gap-1.5 rounded-2xl border border-border/40 bg-background/70 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all"
		>
			{#each gmTools[activeCategory] as tool (tool.id)}
				<button
					onclick={() => vttState.setTool(tool.id)}
					class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 active:scale-95 {vttState.selectedToolId ===
					tool.id
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
					title={tool.label}
				>
					<tool.icon class="h-4 w-4" />
					<span>{tool.label}</span>
				</button>
			{/each}
		</div>
	{:else}
		<!-- Outils Joueur -->
		<div
			class="flex gap-1.5 rounded-2xl border border-border/40 bg-background/70 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl"
		>
			{#each playerTools as tool (tool.id)}
				<button
					onclick={() => vttState.setTool(tool.id)}
					class="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 active:scale-95 {vttState.selectedToolId ===
					tool.id
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
					title={tool.label}
				>
					<tool.icon class="h-4 w-4" />
					<span>{tool.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if showAddToken}
		<div
			class="flex animate-in fade-in slide-in-from-top-2 items-center gap-2 rounded-2xl border border-border/40 bg-background/80 px-3 py-2 shadow-2xl backdrop-blur-3xl"
		>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={tokenLabel}
				onkeydown={onKeydown}
				placeholder="Nom du token…"
				autofocus
				class="w-40 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
			/>
			<button
				onclick={submitAddToken}
				disabled={!tokenLabel.trim()}
				class="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
			>
				Placer
			</button>
		</div>
	{/if}
</div>

<!-- App-wide controls (Sidebar à droite) -->
<div
	class="fixed right-4 top-20 z-50 flex flex-col gap-2 rounded-2xl border border-border/40 bg-background/70 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl"
>
	{#if isGm}
		<button
			onclick={onToggleMaps}
			class="flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-all duration-300 active:scale-95 {showMaps
				? 'bg-primary text-primary-foreground shadow-sm'
				: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
			title="Gérer les maps"
		>
			<MapIcon class="h-5 w-5" />
			<span>Maps</span>
		</button>
		<button
			onclick={onToggleActors}
			class="flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-all duration-300 active:scale-95 {showActors
				? 'bg-primary text-primary-foreground shadow-sm'
				: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
			title="Ouvrir la bibliothèque d'acteurs"
		>
			<UsersIcon class="h-5 w-5" />
			<span>Acteurs</span>
		</button>
		<button
			onclick={onToggleEncounters}
			class="flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-all duration-300 active:scale-95 {showEncounters
				? 'bg-primary text-primary-foreground shadow-sm'
				: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
			title="Déployer une rencontre"
		>
			<SwordsIcon class="h-5 w-5" />
			<span>Rencontres</span>
		</button>
		<div class="mx-auto h-px w-8 rounded-full bg-border/50"></div>
	{/if}

	<button
		onclick={onToggleMySheet}
		class="flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-all duration-300 active:scale-95 {showMySheet
			? 'bg-primary text-primary-foreground shadow-sm'
			: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
		title="Ma fiche"
	>
		<UserIcon class="h-5 w-5" />
		<span>Fiche</span>
	</button>

	<button
		onclick={onToggleDice}
		class="flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-all duration-300 active:scale-95 {showDice
			? 'bg-primary text-primary-foreground shadow-sm'
			: 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}"
		title="Lancer les dés"
	>
		<DicesIcon class="h-5 w-5" />
		<span>Dés</span>
	</button>
</div>
