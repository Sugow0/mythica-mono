<script lang="ts">
	import { page } from "$app/state";
	import CharacterSheetViewer from "$lib/components/character-sheet/character-sheet-viewer.svelte";
	import { Button } from "$lib/components/ui/button";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import * as m from "$lib/paraglide/messages.js";

	const sheetId = $derived(page.params.id ?? "");
</script>

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
	<Button variant="ghost" href="/characters" class="mb-4">
		<ArrowLeftIcon class="h-4 w-4" />
		{m.character_back()}
	</Button>

	{#key sheetId}
		<CharacterSheetViewer {sheetId} />
	{/key}
</div>
