<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CheckIcon from "@lucide/svelte/icons/check";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import type {
		CharacterSheetDetail,
		CharacterSheetField,
	} from "$lib/api/services/character-service";
	import FieldRenderer from "$lib/components/field-renderer.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, characterService } from "$lib/index.js";
	import * as m from "$lib/paraglide/messages.js";
	import { debounce } from "$lib/utils/debounce";

	const sheetId = $derived(page.params.id ?? "");

	let sheet = $state<CharacterSheetDetail | null>(null);
	let values = $state<Record<string, unknown>>({});
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

	/** propertyIds modifiés en attente d'envoi (buffer non réactif). */
	let pending: string[] = [];

	/** Groupes ordonnés [groupName, champs], ordre serveur préservé. */
	const groups = $derived.by(() => {
		const order: string[] = [];
		const byKey: Record<string, CharacterSheetField[]> = {};
		for (const prop of sheet?.properties ?? []) {
			const key = prop.groupName ?? "";
			if (!byKey[key]) {
				byKey[key] = [];
				order.push(key);
			}
			byKey[key].push(prop);
		}
		return order.map((key) => [key, byKey[key]] as const);
	});

	async function load() {
		isLoading = true;
		error = null;
		try {
			const response = await characterService.getCharacterSheetById(sheetId);
			sheet = response ?? null;
			values = Object.fromEntries(
				(response?.properties ?? []).map((p) => [p.propertyId, p.value])
			);
		} catch (err) {
			if (err instanceof ApiError && err.statusCode === 404) {
				error = m.character_not_found();
			} else {
				error =
					err instanceof ApiError ? err.message : m.character_load_error();
			}
		} finally {
			isLoading = false;
		}
	}

	const flush = debounce(async () => {
		if (pending.length === 0) return;
		const batch = pending.map((propertyId) => ({
			propertyId,
			value: values[propertyId],
		}));
		pending = [];
		saveStatus = "saving";
		try {
			await characterService.updateCharacterSheetValues(sheetId, batch);
			saveStatus = "saved";
		} catch {
			saveStatus = "error";
		}
	}, 1000);

	function onFieldChange(propertyId: string, value: unknown) {
		values[propertyId] = value;
		if (!pending.includes(propertyId)) pending.push(propertyId);
		saveStatus = "saving";
		flush();
	}

	onMount(load);
</script>

<div class="mx-auto max-w-3xl px-6 py-8">
	<Button variant="ghost" href="/characters" class="mb-4">
		<ArrowLeftIcon class="h-4 w-4" />
		{m.character_back()}
	</Button>

	{#if isLoading}
		<Skeleton class="mb-6 h-12 w-64" />
		<Skeleton class="h-64 w-full rounded-xl" />
	{:else if error}
		<p class="text-destructive" role="alert">{error}</p>
	{:else if sheet}
		<header class="mb-6 flex items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-3xl font-bold">{sheet.name}</h1>
				<Badge variant="secondary" class="mt-1">{sheet.gameSystem.nom}</Badge>
			</div>
			<div
				class="text-muted-foreground flex items-center gap-1.5 text-sm"
				aria-live="polite"
				data-testid="save-status"
			>
				{#if saveStatus === "saving"}
					<LoaderIcon class="h-4 w-4 animate-spin" />
					{m.character_save_saving()}
				{:else if saveStatus === "saved"}
					<CheckIcon class="text-primary h-4 w-4" />
					{m.character_save_saved()}
				{:else if saveStatus === "error"}
					<TriangleAlertIcon class="text-destructive h-4 w-4" />
					{m.character_save_error()}
				{/if}
			</div>
		</header>

		<div class="flex flex-col gap-6">
			{#each groups as [groupName, fields] (groupName)}
				<Card.Root>
					{#if groupName}
						<Card.Header>
							<Card.Title class="text-lg">{groupName}</Card.Title>
						</Card.Header>
					{/if}
					<Card.Content
						class="grid grid-cols-1 gap-4 sm:grid-cols-2 {groupName
							? ''
							: 'pt-6'}"
					>
						{#each fields as field (field.propertyId)}
							<FieldRenderer
								property={field}
								value={values[field.propertyId]}
								onChange={(v) => onFieldChange(field.propertyId, v)}
							/>
						{/each}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
