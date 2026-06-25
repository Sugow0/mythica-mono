<script lang="ts">
	let { participants }: { participants: string[] } = $props();
</script>

<div class="fixed left-4 top-4 z-50 flex gap-2">
	{#each participants as userId (userId)}
		<div
			class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white ring-2 ring-red-600"
			title={userId}
		>
			{userId.slice(0, 2).toUpperCase()}
		</div>
	{/each}
	{#if participants.length === 0}
		<div class="rounded-lg bg-slate-800/80 px-3 py-1 text-xs text-slate-400">
			Connexion…
		</div>
	{/if}
</div>
