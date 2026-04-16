<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>Authentication - Mythica</title>
</svelte:head>

<div>
	{@render children()}
</div>
