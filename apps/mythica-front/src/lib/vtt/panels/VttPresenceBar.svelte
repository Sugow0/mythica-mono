<script lang="ts">
	import UsersIcon from "@lucide/svelte/icons/users";
	import CrownIcon from "@lucide/svelte/icons/crown";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import { vttState } from "../vtt.svelte";

	let {
		participants,
		members = [],
		currentUserId,
		onUpdateProfile,
	}: {
		participants: string[];
		members?: {
			userId: string;
			role: string;
			user?: { pseudo: string | null };
		}[];
		currentUserId?: string;
		onUpdateProfile?: (profile: { name?: string; color?: string }) => void;
	} = $props();

	let editingUserId = $state<string | null>(null);
	let newName = $state("");
	let newColor = $state("");

	function getMemberInfo(userId: string) {
		const member = members.find((m) => m.userId === userId);
		const customName = vttState.customNames[userId];
		const customColor = vttState.customColors[userId];
		return {
			name:
				customName || member?.user?.pseudo || `Joueur ${userId.slice(0, 4)}`,
			role: member?.role || "player",
			color: customColor || stringToColor(userId),
		};
	}

	function stringToColor(str: string) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const c = (hash & 0x00ffffff).toString(16).toUpperCase();
		return "#" + "00000".substring(0, 6 - c.length) + c;
	}

	function startEdit(
		userId: string,
		currentName: string,
		currentColor: string
	) {
		newName = currentName;
		newColor = currentColor;
		editingUserId = userId;
	}

	function submitEdit() {
		if (onUpdateProfile) {
			onUpdateProfile({ name: newName.trim() || undefined, color: newColor });
		}
		editingUserId = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submitEdit();
		if (e.key === "Escape") editingUserId = null;
	}
</script>

<div
	class="fixed bottom-16 left-4 z-40 flex w-56 flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/80 shadow-lg backdrop-blur-sm"
>
	<div
		class="flex items-center gap-2 border-b border-slate-700/50 bg-slate-800/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300"
	>
		<UsersIcon class="h-4 w-4" />
		Joueurs
	</div>
	<div class="flex max-h-48 flex-col overflow-y-auto p-2">
		{#if participants.length === 0}
			<div class="px-2 py-1 text-xs text-slate-500 italic">En attente...</div>
		{:else}
			{#each participants as userId (userId)}
				{@const info = getMemberInfo(userId)}
				<div
					class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-800/50"
				>
					{#if editingUserId === userId}
						<input
							type="color"
							bind:value={newColor}
							class="h-5 w-5 cursor-pointer rounded border-0 p-0 outline-none"
						/>
						<input
							type="text"
							bind:value={newName}
							onkeydown={handleKeydown}
							class="w-full min-w-0 rounded bg-slate-950 px-1 py-0.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-red-500"
							autofocus
						/>
						<button
							class="text-xs text-green-400 hover:text-green-300"
							onclick={submitEdit}>OK</button
						>
					{:else}
						<span
							class="h-2.5 w-2.5 flex-shrink-0 rounded-full {info.role ===
							'spectator'
								? 'opacity-50'
								: ''}"
							style="background-color: {info.color}; box-shadow: 0 0 5px {info.color};"
						></span>

						<span
							class="truncate text-sm font-medium {info.role === 'spectator'
								? 'text-slate-400 italic'
								: 'text-slate-200'}"
							title={info.name}
						>
							{info.name}
						</span>

						{#if currentUserId === userId && info.role !== "spectator"}
							<button
								onclick={() => startEdit(userId, info.name, info.color)}
								class="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white text-slate-400"
								title="Modifier mon profil"
							>
								<PencilIcon class="h-3 w-3" />
							</button>
						{/if}

						{#if info.role === "gm"}
							<CrownIcon
								class="ml-auto h-3.5 w-3.5 flex-shrink-0 text-yellow-500"
								title="Maître du Jeu"
							/>
						{:else if info.role === "spectator"}
							<EyeIcon
								class="ml-auto h-3.5 w-3.5 flex-shrink-0 text-slate-500"
								title="Spectateur"
							/>
						{/if}
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>
