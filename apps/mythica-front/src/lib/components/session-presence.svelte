<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import { initials } from "$lib/utils/presence";

	type Member = { userId: string; pseudo: string | null };

	let {
		members,
		connectedIds = [],
	}: { members: Member[]; connectedIds?: string[] } = $props();

	// Les ids connectés proviennent du sessionStore (mis à jour par PRESENCE_*).
	const connected = $derived(new Set(connectedIds));
	const onlineCount = $derived(
		members.filter((m) => connected.has(m.userId)).length
	);
</script>

<div class="flex items-center gap-3" data-testid="session-presence">
	<div class="flex -space-x-2">
		{#each members as member (member.userId)}
			{@const online = connected.has(member.userId)}
			<div
				class="relative"
				title="{member.pseudo ?? member.userId.slice(0, 8)} — {online
					? 'en ligne'
					: 'hors ligne'}"
			>
				<Avatar.Root
					class="size-9 ring-2 ring-background {online
						? ''
						: 'opacity-50 grayscale'}"
				>
					<Avatar.Fallback
						class={online
							? "bg-red-600 text-xs font-medium text-white"
							: "bg-muted text-xs font-medium text-muted-foreground"}
					>
						{initials(member.pseudo, member.userId)}
					</Avatar.Fallback>
				</Avatar.Root>
				<span class="absolute -right-0.5 -bottom-0.5 flex size-3">
					{#if online}
						<span
							class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
						></span>
						<span
							class="relative inline-flex size-3 rounded-full bg-emerald-500 ring-2 ring-background"
						></span>
					{:else}
						<span
							class="relative inline-flex size-3 rounded-full bg-slate-300 ring-2 ring-background dark:bg-slate-600"
						></span>
					{/if}
				</span>
			</div>
		{/each}
	</div>
	<span class="text-sm text-muted-foreground">{onlineCount} en ligne</span>
</div>
