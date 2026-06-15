<script lang="ts">
	import MinusIcon from "@lucide/svelte/icons/minus";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import { untrack } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as NativeSelect from "$lib/components/ui/native-select";
	import { debounce } from "$lib/utils/debounce";
	import { adjustHp, DND5E_CHARACTER_STATES } from "$lib/utils/dnd5e";

	type Values = {
		current?: number;
		max?: number;
		temp?: number;
		hitDiceCurrent?: number;
		hitDiceMax?: number;
		inspiration?: boolean;
		state?: string;
	};

	let {
		values = {},
		onSave,
	}: { values?: Values; onSave?: (v: Required<Values>) => void } = $props();

	const init = untrack(() => values);
	let current = $state(init.current ?? 10);
	let max = $state(init.max ?? 10);
	let temp = $state(init.temp ?? 0);
	let hitDiceCurrent = $state(init.hitDiceCurrent ?? 1);
	let hitDiceMax = $state(init.hitDiceMax ?? 1);
	let inspiration = $state(init.inspiration ?? false);
	let charState = $state(init.state ?? "normal");
	let amount = $state(1);

	const saveDebounced = debounce(
		() =>
			onSave?.({
				current,
				max,
				temp,
				hitDiceCurrent,
				hitDiceMax,
				inspiration,
				state: charState,
			}),
		1000
	);

	function applyDelta(delta: number) {
		const next = adjustHp({ current, temp, max }, delta);
		current = next.current;
		temp = next.temp;
		saveDebounced();
	}
</script>

<div class="space-y-4">
	<!-- Points de vie -->
	<div class="rounded-xl border border-border bg-card p-4">
		<div class="flex items-center justify-between gap-3">
			<Button
				variant="outline"
				size="icon"
				aria-label="PV -1"
				onclick={() => applyDelta(-1)}
			>
				<MinusIcon class="h-4 w-4" />
			</Button>
			<div class="text-center">
				<div class="text-3xl font-bold tabular-nums">
					<span data-testid="hp-current">{current}</span>
					<span class="text-muted-foreground">/ {max}</span>
				</div>
				<div class="text-xs tracking-wide text-muted-foreground uppercase">
					Points de vie
				</div>
			</div>
			<Button
				variant="outline"
				size="icon"
				aria-label="PV +1"
				onclick={() => applyDelta(1)}
			>
				<PlusIcon class="h-4 w-4" />
			</Button>
		</div>

		<div class="mt-3 flex items-end gap-2">
			<div class="flex-1 space-y-1">
				<Label for="hp-amount" class="text-xs">Montant</Label>
				<Input
					id="hp-amount"
					type="number"
					min={0}
					bind:value={amount}
					aria-label="Montant"
				/>
			</div>
			<Button
				variant="outline"
				class="text-red-600"
				onclick={() => applyDelta(-Math.abs(amount))}
			>
				Dégâts
			</Button>
			<Button
				variant="outline"
				class="text-emerald-600"
				onclick={() => applyDelta(Math.abs(amount))}
			>
				Soins
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="space-y-1">
			<Label for="hp-max">PV max</Label>
			<Input
				id="hp-max"
				type="number"
				min={0}
				bind:value={max}
				oninput={saveDebounced}
			/>
		</div>
		<div class="space-y-1">
			<Label for="hp-temp">PV temporaires</Label>
			<Input
				id="hp-temp"
				type="number"
				min={0}
				bind:value={temp}
				oninput={saveDebounced}
			/>
		</div>
		<div class="space-y-1">
			<Label for="hit-dice">Dés de vie</Label>
			<Input
				id="hit-dice"
				type="number"
				min={0}
				bind:value={hitDiceCurrent}
				oninput={saveDebounced}
				aria-label="Dés de vie restants"
			/>
		</div>
		<div class="space-y-1">
			<Label for="char-state">État</Label>
			<NativeSelect.Root
				id="char-state"
				bind:value={charState}
				onchange={saveDebounced}
			>
				{#each DND5E_CHARACTER_STATES as s (s.key)}
					<NativeSelect.Option value={s.key}>{s.label}</NativeSelect.Option>
				{/each}
			</NativeSelect.Root>
		</div>
	</div>

	<label class="flex items-center gap-2 text-sm">
		<input
			type="checkbox"
			bind:checked={inspiration}
			onchange={saveDebounced}
			class="size-4 accent-red-600"
		/>
		Inspiration
	</label>
</div>
