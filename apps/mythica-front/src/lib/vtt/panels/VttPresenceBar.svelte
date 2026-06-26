<script lang="ts">
	import UsersIcon from "@lucide/svelte/icons/users";
	import CrownIcon from "@lucide/svelte/icons/crown";

	let {
		participants,
		members = [],
	}: { participants: string[]; members?: any[] } = $props();

	function getMemberInfo(userId: string) {
		const member = members.find((m) => m.userId === userId);
		return {
			name: member?.user?.pseudo || `Joueur ${userId.slice(0, 4)}`,
			role: member?.role || "player",
			color: stringToColor(userId),
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
</script>

<div
	class="fixed bottom-16 left-4 z-40 flex w-48 flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/80 shadow-lg backdrop-blur-sm"
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
					class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-800/50"
				>
					<span
						class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
						style="background-color: {info.color}; box-shadow: 0 0 5px {info.color};"
					></span>
					<span
						class="truncate text-sm font-medium text-slate-200"
						title={info.name}
					>
						{info.name}
					</span>
					{#if info.role === "gm"}
						<CrownIcon
							class="ml-auto h-3.5 w-3.5 flex-shrink-0 text-yellow-500"
							title="Maître du Jeu"
						/>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>
