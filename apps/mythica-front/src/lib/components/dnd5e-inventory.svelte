<script lang="ts">
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { untrack } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as NativeSelect from "$lib/components/ui/native-select";
	import { debounce } from "$lib/utils/debounce";
	import {
		DEFAULT_PROFICIENCY_BONUS,
		DND5E_ABILITIES,
		formatModifier,
		type InventoryItem,
		skillBonus,
		totalWeight,
	} from "$lib/utils/dnd5e";

	type Weapon = {
		id: string;
		name: string;
		ability: string;
		proficient: boolean;
	};
	type Scores = Record<string, number>;

	let {
		values = {},
		abilities = {},
		proficiencyBonus = DEFAULT_PROFICIENCY_BONUS,
		onSave,
	}: {
		values?: { items?: InventoryItem[]; weapons?: Weapon[] };
		abilities?: Scores;
		proficiencyBonus?: number;
		onSave?: (v: { items: InventoryItem[]; weapons: Weapon[] }) => void;
	} = $props();

	let items = $state<InventoryItem[]>(untrack(() => [...(values.items ?? [])]));
	let weapons = $state<Weapon[]>(untrack(() => [...(values.weapons ?? [])]));

	const charge = $derived(totalWeight(items));

	const saveDebounced = debounce(
		() => onSave?.({ items: [...items], weapons: [...weapons] }),
		1000
	);

	function addItem() {
		items.push({
			id: crypto.randomUUID(),
			name: "",
			quantity: 1,
			weight: 0,
			equipped: false,
		});
		saveDebounced();
	}
	function removeItem(id: string) {
		items = items.filter((i) => i.id !== id);
		saveDebounced();
	}
	function addWeapon() {
		weapons.push({
			id: crypto.randomUUID(),
			name: "",
			ability: "force",
			proficient: true,
		});
		saveDebounced();
	}
	function removeWeapon(id: string) {
		weapons = weapons.filter((w) => w.id !== id);
		saveDebounced();
	}
</script>

<div class="space-y-6">
	<!-- Inventaire -->
	<section>
		<div class="mb-2 flex items-center justify-between">
			<h3
				class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				Inventaire
			</h3>
			<span class="text-sm text-muted-foreground">
				Charge : <span
					class="font-semibold tabular-nums"
					data-testid="inventory-total">{charge}</span
				>
			</span>
		</div>
		<div class="space-y-1" data-testid="inventory-items">
			{#each items as item (item.id)}
				<div class="flex items-center gap-2">
					<Input
						class="flex-1"
						placeholder="Objet"
						bind:value={item.name}
						oninput={saveDebounced}
						aria-label="Nom de l'objet"
					/>
					<Input
						class="w-16"
						type="number"
						min={0}
						bind:value={item.quantity}
						oninput={saveDebounced}
						aria-label="Quantité"
					/>
					<Input
						class="w-20"
						type="number"
						min={0}
						step="0.1"
						bind:value={item.weight}
						oninput={saveDebounced}
						aria-label="Poids"
					/>
					<label class="flex items-center gap-1 text-xs" title="Équipé">
						<input
							type="checkbox"
							bind:checked={item.equipped}
							onchange={saveDebounced}
							class="size-4 accent-red-600"
							aria-label="Équipé"
						/>
					</label>
					<button
						type="button"
						onclick={() => removeItem(item.id)}
						class="rounded p-1.5 text-slate-400 hover:text-red-500"
						aria-label="Supprimer l'objet"
					>
						<Trash2Icon class="h-4 w-4" />
					</button>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">Aucun objet.</p>
			{/each}
		</div>
		<Button variant="outline" size="sm" class="mt-2" onclick={addItem}>
			<PlusIcon class="h-4 w-4" />Ajouter un objet
		</Button>
	</section>

	<!-- Armes -->
	<section>
		<h3
			class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Armes
		</h3>
		<div class="space-y-1" data-testid="weapons">
			{#each weapons as weapon, i (weapon.id)}
				{@const atk = skillBonus(
					abilities[weapon.ability] ?? 10,
					weapon.proficient,
					proficiencyBonus
				)}
				<div class="flex items-center gap-2">
					<Input
						class="flex-1"
						placeholder="Arme"
						bind:value={weapon.name}
						oninput={saveDebounced}
						aria-label="Nom de l'arme"
					/>
					<NativeSelect.Root
						class="w-24"
						bind:value={weapon.ability}
						onchange={saveDebounced}
						aria-label="Caractéristique"
					>
						{#each DND5E_ABILITIES as ability (ability.key)}
							<NativeSelect.Option value={ability.key}>
								{ability.abbr}
							</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
					<label class="flex items-center gap-1 text-xs" title="Maîtrisé">
						<input
							type="checkbox"
							bind:checked={weapon.proficient}
							onchange={saveDebounced}
							class="size-4 accent-red-600"
							aria-label="Arme maîtrisée"
						/>
					</label>
					<span
						class="w-12 text-right text-sm font-semibold tabular-nums"
						data-testid="weapon-attack-{i}"
					>
						{formatModifier(atk)}
					</span>
					<button
						type="button"
						onclick={() => removeWeapon(weapon.id)}
						class="rounded p-1.5 text-slate-400 hover:text-red-500"
						aria-label="Supprimer l'arme"
					>
						<Trash2Icon class="h-4 w-4" />
					</button>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">Aucune arme.</p>
			{/each}
		</div>
		<Button variant="outline" size="sm" class="mt-2" onclick={addWeapon}>
			<PlusIcon class="h-4 w-4" />Ajouter une arme
		</Button>
	</section>
</div>
