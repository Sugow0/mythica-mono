<script lang="ts">
	import XIcon from "@lucide/svelte/icons/x";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";

	let {
		tags = $bindable([]),
		disabled = false,
		id,
	}: { tags?: string[]; disabled?: boolean; id?: string } = $props();

	let value = $state("");

	function addTag() {
		const tag = value.trim().toLowerCase();
		if (tag && !tags.includes(tag) && tags.length < 10) {
			tags = [...tags, tag];
		}
		value = "";
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			event.preventDefault();
			addTag();
		}
	}
</script>

<div class="space-y-2">
	<div class="flex gap-2">
		<Input
			{id}
			type="text"
			placeholder="ex: medfan, sci-fi, débutant…"
			bind:value
			onkeydown={onKeydown}
			{disabled}
			maxlength={30}
		/>
		<Button
			type="button"
			variant="outline"
			onclick={addTag}
			disabled={disabled || !value.trim()}
		>
			Ajouter
		</Button>
	</div>
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag (tag)}
				<Badge variant="secondary" class="gap-1">
					{tag}
					<button
						type="button"
						onclick={() => removeTag(tag)}
						{disabled}
						aria-label="Retirer {tag}"
						class="rounded-full hover:text-red-500"
					>
						<XIcon class="h-3 w-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}
</div>
