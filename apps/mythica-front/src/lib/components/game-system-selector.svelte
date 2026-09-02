<script lang="ts">
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import { onMount } from "svelte";
	import { Badge } from "$lib/components/ui/badge";
	import * as Select from "$lib/components/ui/select";
	import { gameSystemService } from "$lib/index.js";

	type GameSystem = {
		id: string;
		nom: string;
		version: string;
		isOfficial: boolean;
		parentSystemId: string | null;
	};

	type TreeNode = GameSystem & { children: GameSystem[] };

	type Props = {
		value?: string;
		id?: string;
		disabled?: boolean;
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

	/** Roots with their direct children. Only 2 levels needed for current data. */
	const officialTree = $derived(buildTree(systems.filter((s) => s.isOfficial)));
	const customTree = $derived(buildTree(systems.filter((s) => !s.isOfficial)));
	const selected = $derived(systems.find((s) => s.id === value));

	function buildTree(flat: GameSystem[]): TreeNode[] {
		const roots = flat.filter((s) => !s.parentSystemId);
		return roots.map((root) => ({
			...root,
			children: systems.filter((s) => s.parentSystemId === root.id),
		}));
	}

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
		{#if officialTree.length > 0}
			{#each officialTree as root (root.id)}
				{#if root.children.length > 0}
					<!-- Parent avec enfants : en-tête de groupe, non sélectionnable -->
					<Select.Group>
						<Select.GroupHeading class="flex items-center gap-1.5">
							<SparklesIcon class="h-3 w-3 text-primary/70" />
							<span>{root.nom}</span>
							<span class="text-xs font-normal text-muted-foreground"
								>v{root.version}</span
							>
						</Select.GroupHeading>
						{#each root.children as child (child.id)}
							<Select.Item value={child.id} label={child.nom}>
								<span class="flex w-full items-center gap-2 pl-2">
									<ChevronRightIcon
										class="h-3 w-3 shrink-0 text-muted-foreground/50"
									/>
									<span class="font-medium">{child.nom}</span>
									<span class="text-xs text-muted-foreground"
										>v{child.version}</span
									>
								</span>
							</Select.Item>
						{/each}
					</Select.Group>
				{:else}
					<!-- Feuille officielle sans enfants : directement sélectionnable -->
					<Select.Item value={root.id} label={root.nom}>
						<span class="flex w-full items-center gap-2">
							<SparklesIcon class="h-3.5 w-3.5 text-primary/70" />
							<span class="font-medium">{root.nom}</span>
							<span class="text-xs text-muted-foreground">v{root.version}</span>
							<Badge variant="default" class="ml-auto">Officiel</Badge>
						</span>
					</Select.Item>
				{/if}
			{/each}
		{/if}

		{#if customTree.length > 0}
			<Select.Group>
				<Select.GroupHeading>Systèmes personnalisés</Select.GroupHeading>
				{#each customTree as root (root.id)}
					{#if root.children.length > 0}
						<!-- Groupe custom avec sous-versions -->
						<Select.Group>
							<Select.GroupHeading class="pl-2 text-xs font-normal">
								{root.nom}
								<span class="text-muted-foreground">v{root.version}</span>
							</Select.GroupHeading>
							{#each root.children as child (child.id)}
								<Select.Item value={child.id} label={child.nom}>
									<span class="flex w-full items-center gap-2 pl-4">
										<ChevronRightIcon
											class="h-3 w-3 shrink-0 text-muted-foreground/50"
										/>
										<span class="font-medium">{child.nom}</span>
										<span class="text-xs text-muted-foreground"
											>v{child.version}</span
										>
									</span>
								</Select.Item>
							{/each}
						</Select.Group>
					{:else}
						<Select.Item value={root.id} label={root.nom}>
							<span class="flex w-full items-center gap-2">
								<span class="font-medium">{root.nom}</span>
								<span class="text-xs text-muted-foreground"
									>v{root.version}</span
								>
								<Badge variant="secondary" class="ml-auto">Custom</Badge>
							</span>
						</Select.Item>
					{/if}
				{/each}
			</Select.Group>
		{/if}
	</Select.Content>
</Select.Root>
