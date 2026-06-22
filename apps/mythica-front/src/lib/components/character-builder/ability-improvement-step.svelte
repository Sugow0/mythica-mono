<script lang="ts">
	import MinusIcon from "@lucide/svelte/icons/minus";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import type {
		CharacterBuilder,
		Improvement,
	} from "$lib/character-builder/builder.svelte";
	import { DND5E_ABILITIES, formatModifier } from "$lib/utils/dnd5e";

	let { builder }: { builder: CharacterBuilder } = $props();

	const feats = $derived(
		(builder.content.don ?? [])
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
	);

	/** Dimensionne le tableau d'améliorations au nombre d'emplacements. */
	$effect(() => {
		const n = builder.improvementSlots;
		if (builder.improvements.length === n) return;
		const next: Improvement[] = [];
		for (let i = 0; i < n; i++) {
			next.push(builder.improvements[i] ?? { type: "asi", abilities: {} });
		}
		builder.improvements = next;
	});

	function setType(i: number, type: "asi" | "feat") {
		builder.improvements = builder.improvements.map((imp, idx) =>
			idx === i
				? type === "asi"
					? { type: "asi", abilities: {} }
					: { type: "feat", slug: "" }
				: imp
		);
	}

	function asi(i: number): Record<string, number> {
		const imp = builder.improvements[i];
		return imp?.type === "asi" ? imp.abilities : {};
	}
	const slotTotal = (i: number) =>
		Object.values(asi(i)).reduce((s, v) => s + v, 0);

	function bump(i: number, key: string, delta: number) {
		const cur = { ...asi(i) };
		const next = (cur[key] ?? 0) + delta;
		if (next < 0 || next > 2) return;
		if (delta > 0 && slotTotal(i) >= 2) return;
		if (next === 0) delete cur[key];
		else cur[key] = next;
		builder.improvements = builder.improvements.map((imp, idx) =>
			idx === i ? { type: "asi", abilities: cur } : imp
		);
	}

	function setFeat(i: number, slug: string) {
		builder.improvements = builder.improvements.map((imp, idx) =>
			idx === i ? { type: "feat", slug } : imp
		);
	}

	const featDesc = (slug: string) =>
		(builder.content.don ?? []).find((d) => d.slug === slug)?.description ?? "";
</script>

<div class="mx-auto max-w-4xl">
	<div class="grid gap-6 lg:grid-cols-[1fr_15rem] lg:items-start">
		<div class="space-y-5">
			<p class="text-muted-foreground text-sm">
				À chaque palier, choisissez une amélioration de caractéristiques (+2 sur
				une ou +1 sur deux)
				<span class="text-foreground font-medium">ou</span> un don.
			</p>

			{#each builder.improvements as imp, i (i)}
				{@const isAsi = imp.type === "asi"}
				<div class="space-y-3 rounded-xl border p-4">
					<div class="flex items-center justify-between">
						<span class="font-display font-semibold">Amélioration {i + 1}</span>
						<div class="flex gap-1">
							<button
								type="button"
								onclick={() => setType(i, "asi")}
								class="rounded-md px-3 py-1 text-sm font-medium transition-colors {isAsi
									? 'bg-primary text-primary-foreground'
									: 'hover:bg-muted'}">Caractéristiques</button
							>
							<button
								type="button"
								onclick={() => setType(i, "feat")}
								class="rounded-md px-3 py-1 text-sm font-medium transition-colors {!isAsi
									? 'bg-primary text-primary-foreground'
									: 'hover:bg-muted'}">Don</button
							>
						</div>
					</div>

					{#if isAsi}
						<div class="space-y-1.5">
							{#each DND5E_ABILITIES as ab (ab.key)}
								{@const v = asi(i)[ab.key] ?? 0}
								<div class="flex items-center gap-3 text-sm">
									<span class="w-28">{ab.label}</span>
									<button
										type="button"
										aria-label="Diminuer {ab.label}"
										disabled={v === 0}
										onclick={() => bump(i, ab.key, -1)}
										class="flex h-6 w-6 items-center justify-center rounded-md border disabled:opacity-30"
									>
										<MinusIcon class="h-3 w-3" />
									</button>
									<span class="w-6 text-center font-semibold tabular-nums"
										>+{v}</span
									>
									<button
										type="button"
										aria-label="Augmenter {ab.label}"
										disabled={slotTotal(i) >= 2 || v >= 2}
										onclick={() => bump(i, ab.key, 1)}
										class="flex h-6 w-6 items-center justify-center rounded-md border disabled:opacity-30"
									>
										<PlusIcon class="h-3 w-3" />
									</button>
								</div>
							{/each}
							<p class="text-muted-foreground text-xs">
								{2 - slotTotal(i)} point(s) restant(s)
							</p>
						</div>
					{:else}
						<div class="space-y-2">
							<select
								aria-label="Don"
								value={imp.type === "feat" ? imp.slug : ""}
								onchange={(e) => setFeat(i, e.currentTarget.value)}
								class="focus-visible:ring-ring/50 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
							>
								<option value="">— Choisir un don —</option>
								{#each feats as f (f.slug)}
									<option value={f.slug}>{f.name}</option>
								{/each}
							</select>
							{#if imp.type === "feat" && imp.slug}
								<p class="text-muted-foreground text-xs">
									{featDesc(imp.slug)}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Caractéristiques finales, mises à jour en temps réel -->
		<aside class="lg:sticky lg:top-4">
			<div class="rounded-xl border p-4">
				<p
					class="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide"
				>
					Caractéristiques finales
				</p>
				<div class="grid grid-cols-3 gap-2 text-center">
					{#each DND5E_ABILITIES as ab (ab.key)}
						{@const score = builder.effectiveScores[ab.key] ?? 10}
						<div class="rounded-lg border py-2">
							<p class="text-muted-foreground text-[10px] uppercase">
								{ab.abbr}
							</p>
							<p class="font-display text-xl font-bold leading-none">{score}</p>
							<p class="text-muted-foreground text-xs">
								{formatModifier(builder.modifiers[ab.key] ?? 0)}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</aside>
	</div>
</div>
