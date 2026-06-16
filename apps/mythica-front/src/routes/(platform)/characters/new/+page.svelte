<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import { goto } from "$app/navigation";
	import GameSystemSelector from "$lib/components/game-system-selector.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { ApiError, characterService } from "$lib/index.js";
	import * as m from "$lib/paraglide/messages.js";

	const uid = $props.id();

	let name = $state("");
	let gameSystemId = $state("");
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const isValid = $derived(name.trim().length >= 1 && gameSystemId.length > 0);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!isValid || isLoading) return;
		isLoading = true;
		error = null;
		try {
			const response = await characterService.createCharacterSheet({
				name: name.trim(),
				gameSystemId,
			});
			if (response?.id) {
				await goto(`/characters/${response.id}`);
			}
		} catch (err) {
			error =
				err instanceof ApiError ? err.message : m.character_create_error();
			isLoading = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl px-6 py-8">
	<Button variant="ghost" href="/characters" class="mb-4">
		<ArrowLeftIcon class="h-4 w-4" />
		{m.character_back()}
	</Button>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.character_new_title()}</Card.Title>
		</Card.Header>
		<form onsubmit={handleSubmit} aria-busy={isLoading}>
			<Card.Content class="flex flex-col gap-6">
				<div class="flex flex-col gap-2">
					<Label for="system-{uid}">{m.character_new_system_label()}</Label>
					<GameSystemSelector
						id="system-{uid}"
						bind:value={gameSystemId}
						disabled={isLoading}
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="name-{uid}">{m.character_name_label()}</Label>
					<Input
						id="name-{uid}"
						bind:value={name}
						placeholder={m.character_name_placeholder()}
						disabled={isLoading}
						maxlength={255}
						required
					/>
				</div>

				{#if error}
					<p class="text-destructive text-sm" role="alert">{error}</p>
				{/if}
			</Card.Content>
			<Card.Footer class="mt-6 justify-end">
				<Button type="submit" disabled={!isValid || isLoading}>
					{m.character_create_submit()}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
