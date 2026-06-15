<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { untrack } from "svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { debounce } from "$lib/utils/debounce";
	import { groupSpellsByLevel, type Spell } from "$lib/utils/dnd5e";

	type Slot = { max: number; used: number };
	type Ability = { id: string; name: string; description: string };

	let {
		values = {},
		onSave,
	}: {
		values?: {
			spells?: Spell[];
			abilities?: Ability[];
			slots?: Record<number, Slot>;
		};
		onSave?: (v: {
			spells: Spell[];
			abilities: Ability[];
			slots: Record<number, Slot>;
		}) => void;
	} = $props();

	const SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	let spells = $state<Spell[]>(untrack(() => [...(values.spells ?? [])]));
	let abilities = $state<Ability[]>(
		untrack(() => [...(values.abilities ?? [])])
	);
	let slots = $state<Record<number, Slot>>(
		untrack(() => {
			const out: Record<number, Slot> = {};
			for (const lvl of SLOT_LEVELS) {
				out[lvl] = {
					max: values.slots?.[lvl]?.max ?? 0,
					used: values.slots?.[lvl]?.used ?? 0,
				};
			}
			return out;
		})
	);
	const expanded = new SvelteSet<string>();

	const groups = $derived(groupSpellsByLevel(spells));

	const saveDebounced = debounce(
		() =>
			onSave?.({
				spells: [...spells],
				abilities: [...abilities],
				slots: { ...slots },
			}),
		1000
	);

	function setSlotUsed(level: number, pipIndex: number) {
		const slot = slots[level];
		// Clic sur la dernière case pleine → on la vide ; sinon on remplit jusque-là.
		slot.used = slot.used === pipIndex + 1 ? pipIndex : pipIndex + 1;
		saveDebounced();
	}

	function toggleExpanded(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}

	function addSpell() {
		spells.push({ id: crypto.randomUUID(), name: "", level: 0 });
		saveDebounced();
	}
	function removeSpell(id: string) {
		spells = spells.filter((s) => s.id !== id);
		saveDebounced();
	}
	function addAbility() {
		abilities.push({ id: crypto.randomUUID(), name: "", description: "" });
		saveDebounced();
	}
	function removeAbility(id: string) {
		abilities = abilities.filter((a) => a.id !== id);
		saveDebounced();
	}
</script>

<div class="space-y-6">
	<!-- Emplacements de sorts -->
	<section>
		<h3
			class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Emplacements de sorts
		</h3>
		<div class="grid grid-cols-1 gap-1 sm:grid-cols-3">
			{#each SLOT_LEVELS as level (level)}
				<div class="flex items-center gap-2">
					<span class="w-12 text-xs text-muted-foreground">Niv. {level}</span>
					<Input
						type="number"
						min={0}
						max={9}
						class="w-14"
						bind:value={slots[level].max}
						oninput={saveDebounced}
						aria-label="Emplacements niveau {level}"
					/>
					<div class="flex gap-0.5" data-testid="slots-{level}">
						{#each Array(Math.max(0, slots[level].max)) as _, i (i)}
							<button
								type="button"
								onclick={() => setSlotUsed(level, i)}
								aria-label="Emplacement {level}-{i + 1}"
								class="size-3.5 rounded-full border border-red-400 {i <
								slots[level].used
									? 'bg-red-500'
									: 'bg-transparent'}"
							></button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Sorts -->
	<section>
		<div class="mb-2 flex items-center justify-between">
			<h3
				class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				Sorts
			</h3>
			<Button variant="outline" size="sm" onclick={addSpell}>
				<PlusIcon class="h-4 w-4" />Ajouter un sort
			</Button>
		</div>
		{#each groups as group (group.level)}
			<div class="mb-3">
				<h4 class="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">
					{group.label}
				</h4>
				<div class="space-y-1">
					{#each group.spells as spell (spell.id)}
						<div class="rounded-lg border border-border">
							<div class="flex items-center gap-2 p-2">
								<button
									type="button"
									onclick={() => toggleExpanded(spell.id)}
									aria-label="Détail {spell.name || 'sort'}"
									class="text-muted-foreground hover:text-foreground"
								>
									<ChevronDownIcon
										class="h-4 w-4 transition-transform {expanded.has(spell.id)
											? 'rotate-180'
											: ''}"
									/>
								</button>
								<Input
									class="flex-1"
									placeholder="Nom du sort"
									bind:value={spell.name}
									oninput={saveDebounced}
									aria-label="Nom du sort"
								/>
								<Input
									type="number"
									min={0}
									max={9}
									class="w-14"
									bind:value={spell.level}
									oninput={saveDebounced}
									aria-label="Niveau du sort"
								/>
								<button
									type="button"
									onclick={() => removeSpell(spell.id)}
									class="rounded p-1.5 text-slate-400 hover:text-red-500"
									aria-label="Supprimer le sort"
								>
									<Trash2Icon class="h-4 w-4" />
								</button>
							</div>
							{#if expanded.has(spell.id)}
								<div class="space-y-2 border-t border-border p-2">
									<div class="flex gap-2">
										<Input
											class="flex-1"
											placeholder="Portée"
											bind:value={spell.range}
											oninput={saveDebounced}
											aria-label="Portée"
										/>
										<Input
											class="flex-1"
											placeholder="Durée"
											bind:value={spell.duration}
											oninput={saveDebounced}
											aria-label="Durée"
										/>
									</div>
									<Textarea
										placeholder="Description"
										bind:value={spell.description}
										oninput={saveDebounced}
										aria-label="Description"
										class="resize-none"
										rows={2}
									/>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Aucun sort.</p>
		{/each}
	</section>

	<!-- Capacités de classe/race -->
	<section>
		<div class="mb-2 flex items-center justify-between">
			<h3
				class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				Capacités
			</h3>
			<Button variant="outline" size="sm" onclick={addAbility}>
				<PlusIcon class="h-4 w-4" />Ajouter une capacité
			</Button>
		</div>
		<div class="space-y-2" data-testid="abilities">
			{#each abilities as ability (ability.id)}
				<div class="rounded-lg border border-border p-2">
					<div class="flex items-center gap-2">
						<Input
							class="flex-1"
							placeholder="Nom de la capacité"
							bind:value={ability.name}
							oninput={saveDebounced}
							aria-label="Nom de la capacité"
						/>
						<button
							type="button"
							onclick={() => removeAbility(ability.id)}
							class="rounded p-1.5 text-slate-400 hover:text-red-500"
							aria-label="Supprimer la capacité"
						>
							<Trash2Icon class="h-4 w-4" />
						</button>
					</div>
					<Textarea
						placeholder="Description"
						bind:value={ability.description}
						oninput={saveDebounced}
						aria-label="Description de la capacité"
						class="mt-2 resize-none"
						rows={2}
					/>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">Aucune capacité.</p>
			{/each}
		</div>
	</section>
</div>
