<script lang="ts">
	let { participants }: { participants: string[] } = $props();
</script>

<div class="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
	{#each participants as userId (userId)}
		<div
			class="h-7 w-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs text-slate-300"
			title={userId}
		>
			{userId.slice(0, 2).toUpperCase()}
		</div>
	{/each}
</div>
