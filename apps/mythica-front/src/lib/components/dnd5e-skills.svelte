<script lang="ts">
	import DicesIcon from "@lucide/svelte/icons/dices";
	import { untrack } from "svelte";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { debounce } from "$lib/utils/debounce";
	import {
		type D20Roll,
		DEFAULT_PROFICIENCY_BONUS,
		DND5E_ABILITIES,
		DND5E_SKILLS,
		formatModifier,
		rollD20,
		skillBonus,
	} from "$lib/utils/dnd5e";

	type Scores = Record<string, number>;
	type ProfMap = Record<string, boolean>;

	let {
		abilities = {},
		proficiencyBonus = DEFAULT_PROFICIENCY_BONUS,
		values = {},
		onSave,
		onRoll,
		rng,
	}: {
		abilities?: Scores;
		proficiencyBonus?: number;
		values?: { skills?: ProfMap; saves?: ProfMap };
		onSave?: (v: { skills: ProfMap; saves: ProfMap }) => void;
		onRoll?: (r: D20Roll & { label: string }) => void;
		rng?: () => number;
	} = $props();

	// Valeurs initiales seulement (untrack : pas de capture réactive du prop).
	let skills = $state<ProfMap>(untrack(() => ({ ...values.skills })));
	let saves = $state<ProfMap>(untrack(() => ({ ...values.saves })));

	const saveDebounced = debounce(
		() => onSave?.({ skills: { ...skills }, saves: { ...saves } }),
		1000
	);

	const scoreOf = (abilityKey: string) => abilities[abilityKey] ?? 10;

	function toggle(map: ProfMap, key: string) {
		map[key] = !map[key];
		saveDebounced();
	}

	function roll(label: string, bonus: number) {
		onRoll?.({ ...rollD20(bonus, rng), label });
	}
</script>

{#snippet row(
	key: string,
	label: string,
	abilityKey: string,
	map: ProfMap,
	testidPrefix: string
)}
	{@const bonus = skillBonus(scoreOf(abilityKey), !!map[key], proficiencyBonus)}
	<div class="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50">
		<Checkbox
			checked={!!map[key]}
			onCheckedChange={() => toggle(map, key)}
			aria-label="Maîtrise {label}"
		/>
		<span class="min-w-0 flex-1 truncate text-sm">{label}</span>
		<span
			class="w-10 text-right text-sm font-semibold tabular-nums"
			data-testid="{testidPrefix}-{key}"
		>
			{formatModifier(bonus)}
		</span>
		<button
			type="button"
			onclick={() => roll(label, bonus)}
			class="rounded p-1 text-muted-foreground hover:text-red-600"
			aria-label="Lancer {label}"
		>
			<DicesIcon class="h-4 w-4" />
		</button>
	</div>
{/snippet}

<div class="grid gap-6 sm:grid-cols-2">
	<section>
		<h3
			class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Jets de sauvegarde
		</h3>
		<div class="space-y-0.5">
			{#each DND5E_ABILITIES as ability (ability.key)}
				{@render row(
					ability.key,
					ability.label,
					ability.key,
					saves,
					"save-bonus"
				)}
			{/each}
		</div>
	</section>

	<section>
		<h3
			class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Compétences
		</h3>
		<div class="space-y-0.5">
			{#each DND5E_SKILLS as skill (skill.key)}
				{@render row(
					skill.key,
					skill.label,
					skill.ability,
					skills,
					"skill-bonus"
				)}
			{/each}
		</div>
	</section>
</div>
