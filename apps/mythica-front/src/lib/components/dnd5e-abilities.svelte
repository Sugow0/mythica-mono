<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { debounce } from "$lib/utils/debounce";
	import {
		abilityModifier,
		DEFAULT_ABILITY_SCORE,
		DND5E_ABILITIES,
		formatModifier,
	} from "$lib/utils/dnd5e";

	type Scores = Record<string, number>;

	let {
		values = {},
		onSave,
		disabled = false,
	}: {
		values?: Scores;
		onSave?: (values: Scores) => void;
		disabled?: boolean;
	} = $props();

	// État local des 6 caractéristiques (défaut 10), initialisé depuis `values`.
	let scores = $state<Scores>(
		Object.fromEntries(
			DND5E_ABILITIES.map((a) => [
				a.key,
				values[a.key] ?? DEFAULT_ABILITY_SCORE,
			])
		)
	);

	// Auto-save groupé : 1 s après la dernière frappe. `onSave` est appelé dans
	// la closure (et non capturé) pour rester sur la valeur courante du prop.
	const saveDebounced = debounce((next: Scores) => onSave?.(next), 1000);

	function setScore(key: string, raw: string) {
		const parsed = Number.parseInt(raw, 10);
		scores[key] = Number.isNaN(parsed) ? 0 : parsed;
		saveDebounced({ ...scores });
	}
</script>

<div
	class="grid grid-cols-2 gap-3 sm:grid-cols-3"
	data-testid="dnd5e-abilities"
>
	{#each DND5E_ABILITIES as ability (ability.key)}
		{@const mod = abilityModifier(scores[ability.key])}
		<div class="rounded-xl border border-border bg-card p-3 text-center">
			<Label
				for="ability-{ability.key}"
				class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{ability.label}
			</Label>
			<Input
				id="ability-{ability.key}"
				type="number"
				{disabled}
				value={scores[ability.key]}
				oninput={(e) => setScore(ability.key, e.currentTarget.value)}
				aria-label={ability.label}
				class="mt-1 text-center text-2xl font-bold"
			/>
			<div
				class="mt-1 text-sm font-semibold text-red-600 dark:text-red-400"
				data-testid="mod-{ability.key}"
			>
				{formatModifier(mod)}
			</div>
		</div>
	{/each}
</div>
