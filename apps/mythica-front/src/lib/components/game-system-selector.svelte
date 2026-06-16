<script lang="ts">
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import { onMount } from "svelte";
	import { Badge } from "$lib/components/ui/badge";
	import * as Select from "$lib/components/ui/select";
	import { gameSystemService } from "$lib/index.js";

	type GameSystem = {
		id: string;
		nom: string;
		version: string;
		isOfficial: boolean;
	};

	type Props = {
		/** Identifiant du système sélectionné (liaison bidirectionnelle). */
		value?: string;
		/** Id du déclencheur, pour l'association `<label for>`. */
		id?: string;
		disabled?: boolean;
		/** Marque le champ en erreur (aria-invalid). */
		invalid?: boolean;
	};

	let {
		value = $bindable(""),
		id,
		disabled = false,
		invalid = false,
	}: Props = $props();

	let systems = $state<GameSystem[]>([]);
	let loading = $state(true);
	let loadError = $state(false);

	const official = $derived(systems.filter((s) => s.isOfficial));
	const custom = $derived(systems.filter((s) => !s.isOfficial));
	const selected = $derived(systems.find((s) => s.id === value));

	onMount(async () => {
		try {
			const response = await gameSystemService.getGameSystems({ limit: 100 });
			systems = response?.items ?? [];
		} catch {
			loadError = true;
		} finally {
			loading = false;
		}
	});
</script>

<Select.Root type="single" bind:value>
	<Select.Trigger
		{id}
		class="w-full"
		disabled={disabled || loading || loadError}
		aria-invalid={invalid}
	>
		{#if loading}
			<span class="text-muted-foreground">Chargement des systèmes…</span>
		{:else if loadError}
			<span class="text-destructive">Échec du chargement des systèmes</span>
		{:else if selected}
			<span class="flex items-center gap-2">
				<span class="font-medium">{selected.nom}</span>
				<span class="text-xs text-muted-foreground">v{selected.version}</span>
				<Badge variant={selected.isOfficial ? "default" : "secondary"}>
					{selected.isOfficial ? "Officiel" : "Custom"}
				</Badge>
			</span>
		{:else}
			<span class="text-muted-foreground">Sélectionnez un système de jeu</span>
		{/if}
	</Select.Trigger>

	<Select.Content>
		{#if official.length > 0}
			<Select.Group>
				<Select.GroupHeading>Systèmes officiels</Select.GroupHeading>
				{#each official as system (system.id)}
					{@render systemItem(system)}
				{/each}
			</Select.Group>
		{/if}
		{#if custom.length > 0}
			<Select.Group>
				<Select.GroupHeading>Systèmes personnalisés</Select.GroupHeading>
				{#each custom as system (system.id)}
					{@render systemItem(system)}
				{/each}
			</Select.Group>
		{/if}
	</Select.Content>
</Select.Root>

{#snippet systemItem(system: GameSystem)}
	<Select.Item value={system.id} label={system.nom}>
		<span class="flex w-full items-center gap-2">
			{#if system.isOfficial}
				<SparklesIcon class="h-3.5 w-3.5 text-primary/70" />
			{/if}
			<span class="font-medium">{system.nom}</span>
			<span class="text-xs text-muted-foreground">v{system.version}</span>
			<Badge
				variant={system.isOfficial ? "default" : "secondary"}
				class="ml-auto"
			>
				{system.isOfficial ? "Officiel" : "Custom"}
			</Badge>
		</span>
	</Select.Item>
{/snippet}
