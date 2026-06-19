<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CheckIcon from "@lucide/svelte/icons/check";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import SparkleIcon from "@lucide/svelte/icons/sparkles";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { onMount, type Snippet } from "svelte";
	import { page } from "$app/state";
	import type {
		CharacterSheetDetail,
		CharacterSheetField,
	} from "$lib/api/services/character-service";
	import FieldRenderer from "$lib/components/field-renderer.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, characterService } from "$lib/index.js";
	import * as m from "$lib/paraglide/messages.js";
	import { debounce } from "$lib/utils/debounce";
	import {
		abilityModifier,
		DND5E_ABILITIES,
		DND5E_SKILLS,
		formatModifier,
		proficiencyBonusForLevel,
		skillBonus,
	} from "$lib/utils/dnd5e";

	const sheetId = $derived(page.params.id ?? "");

	let sheet = $state<CharacterSheetDetail | null>(null);
	let values = $state<Record<string, unknown>>({});
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

	let pending: string[] = [];

	/** Propriété par clé naturelle. */
	const byKey = $derived.by(() => {
		const map: Record<string, CharacterSheetField> = {};
		for (const p of sheet?.properties ?? []) map[p.key] = p;
		return map;
	});
	const has = (key: string) => byKey[key] !== undefined;
	const val = (key: string) => values[byKey[key]?.propertyId ?? ""];
	function setVal(key: string, v: unknown) {
		const p = byKey[key];
		if (p) onFieldChange(p.propertyId, v);
	}
	function num(key: string): number {
		const n = Number(val(key));
		return Number.isFinite(n) ? n : 0;
	}
	const boolv = (key: string) => val(key) === true || val(key) === "true";
	function resource(key: string): { current: number; max: number } {
		const r = (val(key) ?? {}) as { current?: unknown; max?: unknown };
		return { current: Number(r.current) || 0, max: Number(r.max) || 0 };
	}
	function setResource(key: string, part: "current" | "max", raw: string) {
		setVal(key, { ...resource(key), [part]: raw === "" ? 0 : Number(raw) });
	}

	// — Valeurs dérivées D&D (calculées, pures) —
	const level = $derived(Math.max(1, num("niveau")));
	const prof = $derived(proficiencyBonusForLevel(level));
	const initiative = $derived(abilityModifier(num("dexterite")));
	const passivePerception = $derived(
		10 + skillBonus(num("sagesse"), boolv("perception"), prof)
	);

	/** Niveaux d'emplacements de sorts réellement possédés. */
	const spellSlots = $derived(
		Array.from({ length: 9 }, (_, i) => i + 1)
			.map((lvl) => ({ lvl, ...resource(`spell_slots_${lvl}`) }))
			.filter((s) => s.max > 0)
	);

	const coins = [
		{ key: "pieces_platine", abbr: "PP" },
		{ key: "pieces_or", abbr: "PO" },
		{ key: "pieces_electrum", abbr: "PE" },
		{ key: "pieces_argent", abbr: "PA" },
		{ key: "pieces_cuivre", abbr: "PC" },
	];

	/** Clés rendues par les panneaux dédiés (exclues des sections génériques). */
	const handled = $derived(
		new Set<string>([
			...DND5E_ABILITIES.map((a) => a.key),
			...DND5E_ABILITIES.map((a) => `sauvegarde_${a.key}`),
			...DND5E_SKILLS.map((s) => s.key),
			"niveau",
			"ca",
			"vitesse",
			"initiative",
			"bonus_maitrise",
			"perception_passive",
			"hp",
			"des_de_vie",
			"inspiration",
			"dd_sorts",
			"bonus_attaque_sort",
			...Array.from({ length: 9 }, (_, i) => `spell_slots_${i + 1}`),
			...coins.map((c) => c.key),
		])
	);

	/** Sections narratives restantes (groupes, hors clés déjà rendues). */
	const detailGroups = $derived.by(() => {
		const order: string[] = [];
		const byGroup: Record<string, CharacterSheetField[]> = {};
		for (const p of sheet?.properties ?? []) {
			if (handled.has(p.key)) continue;
			const g = p.groupName ?? "Autres";
			if (!byGroup[g]) {
				byGroup[g] = [];
				order.push(g);
			}
			byGroup[g].push(p);
		}
		return order.map((g) => [g, byGroup[g]] as const);
	});

	const identityLine = $derived(
		[sheet?.gameSystem.nom, `Niveau ${level}`, val("alignement")]
			.filter(Boolean)
			.join(" · ")
	);

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

{#snippet abilityTile(key: string, label: string, abbr: string)}
	{@const score = num(key)}
	<div
		class="bg-card flex flex-col items-center rounded-2xl border px-2 py-3 text-center shadow-xs"
	>
		<span
			class="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest"
		>
			{abbr}
		</span>
		<span
			class="font-display text-primary mt-0.5 text-3xl font-bold leading-none"
		>
			{formatModifier(abilityModifier(score))}
		</span>
		<input
			type="number"
			aria-label={label}
			value={score}
			oninput={(e) => setVal(key, Number(e.currentTarget.value))}
			class="focus-visible:ring-ring/50 mt-2 w-12 rounded-md border bg-background py-0.5 text-center text-sm font-medium outline-none focus-visible:ring-[3px]"
		/>
	</div>
{/snippet}

{#snippet profRow(
	label: string,
	total: number,
	active: boolean,
	onToggle: () => void,
	sub?: string
)}
	<button
		type="button"
		onclick={onToggle}
		aria-pressed={active}
		class="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
	>
		<span
			class="h-3 w-3 shrink-0 rounded-full border-2 transition-colors {active
				? 'border-primary bg-primary'
				: 'border-muted-foreground/40'}"
			aria-hidden="true"
		></span>
		<span
			class="text-foreground font-display w-8 text-right font-semibold tabular-nums"
		>
			{formatModifier(total)}
		</span>
		<span class="flex-1 truncate">{label}</span>
		{#if sub}
			<span class="text-muted-foreground text-[10px] uppercase">{sub}</span>
		{/if}
	</button>
{/snippet}

{#snippet vital(label: string, content: Snippet)}
	<div
		class="bg-card flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center shadow-xs"
	>
		<span
			class="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest"
		>
			{label}
		</span>
		<div class="font-display mt-1 text-2xl font-bold leading-none">
			{@render content()}
		</div>
	</div>
{/snippet}

<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
	<Button variant="ghost" href="/characters" class="mb-4">
		<ArrowLeftIcon class="h-4 w-4" />
		{m.character_back()}
	</Button>

	{#if isLoading}
		<Skeleton class="mb-6 h-16 w-72" />
		<Skeleton class="mb-4 h-24 w-full rounded-2xl" />
		<div class="grid gap-4 lg:grid-cols-3">
			<Skeleton class="h-96 rounded-2xl" />
			<Skeleton class="h-96 rounded-2xl" />
			<Skeleton class="h-96 rounded-2xl" />
		</div>
	{:else if error}
		<p class="text-destructive" role="alert">{error}</p>
	{:else if sheet}
		<!-- En-tête -->
		<header class="mb-6 flex flex-wrap items-center gap-4">
			<span
				class="bg-primary/10 text-primary font-display grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-bold"
				aria-hidden="true"
			>
				{sheet.name.charAt(0).toUpperCase()}
			</span>
			<div class="min-w-0 flex-1">
				<h1 class="font-display truncate text-3xl font-bold">{sheet.name}</h1>
				<p class="text-muted-foreground text-sm">{identityLine}</p>
			</div>

			{#if has("inspiration")}
				<button
					type="button"
					onclick={() => setVal("inspiration", !boolv("inspiration"))}
					aria-pressed={boolv("inspiration")}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors {boolv(
						'inspiration'
					)
						? 'border-primary bg-primary/10 text-primary'
						: 'text-muted-foreground hover:bg-muted'}"
				>
					<SparkleIcon class="h-4 w-4" /> Inspiration
				</button>
			{/if}

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

		<!-- Rail de constantes -->
		<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
			{#if has("ca")}
				{#snippet caVal()}
					<input
						type="number"
						aria-label="Classe d'armure"
						value={num("ca")}
						oninput={(e) => setVal("ca", Number(e.currentTarget.value))}
						class="focus-visible:ring-ring/50 w-16 rounded-md bg-transparent text-center outline-none focus-visible:ring-[3px]"
					/>
				{/snippet}
				{@render vital("Classe d'armure", caVal)}
			{/if}
			{#if has("hp")}
				{#snippet hpVal()}
					<span class="flex items-center justify-center gap-1 text-xl">
						<input
							type="number"
							aria-label="PV actuels"
							value={resource("hp").current}
							oninput={(e) =>
								setResource("hp", "current", e.currentTarget.value)}
							class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-right outline-none focus-visible:ring-[3px]"
						/>
						<span class="text-muted-foreground text-base">/</span>
						<input
							type="number"
							aria-label="PV max"
							value={resource("hp").max}
							oninput={(e) => setResource("hp", "max", e.currentTarget.value)}
							class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-left outline-none focus-visible:ring-[3px]"
						/>
					</span>
				{/snippet}
				{@render vital("Points de vie", hpVal)}
			{/if}
			{#snippet initVal()}{formatModifier(initiative)}{/snippet}
			{@render vital("Initiative", initVal)}
			{#snippet profVal()}{formatModifier(prof)}{/snippet}
			{@render vital("Bonus de maîtrise", profVal)}
			{#snippet ppVal()}{passivePerception}{/snippet}
			{@render vital("Perception passive", ppVal)}
			{#if has("vitesse")}
				{#snippet spdVal()}
					<span class="flex items-baseline justify-center">
						<input
							type="number"
							aria-label="Vitesse"
							value={num("vitesse")}
							oninput={(e) => setVal("vitesse", Number(e.currentTarget.value))}
							class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-center outline-none focus-visible:ring-[3px]"
						/>
						<span class="text-muted-foreground text-sm">m</span>
					</span>
				{/snippet}
				{@render vital("Vitesse", spdVal)}
			{/if}
			{#if has("des_de_vie")}
				{#snippet hdVal()}
					<span class="flex items-center justify-center gap-1 text-xl">
						<input
							type="number"
							aria-label="Dés de vie disponibles"
							value={resource("des_de_vie").current}
							oninput={(e) =>
								setResource("des_de_vie", "current", e.currentTarget.value)}
							class="focus-visible:ring-ring/50 w-10 rounded-md bg-transparent text-right outline-none focus-visible:ring-[3px]"
						/>
						<span class="text-muted-foreground text-base">/</span>
						<input
							type="number"
							aria-label="Dés de vie max"
							value={resource("des_de_vie").max}
							oninput={(e) =>
								setResource("des_de_vie", "max", e.currentTarget.value)}
							class="focus-visible:ring-ring/50 w-10 rounded-md bg-transparent text-left outline-none focus-visible:ring-[3px]"
						/>
					</span>
				{/snippet}
				{@render vital("Dés de vie", hdVal)}
			{/if}
		</div>

		<!-- Corps 3 colonnes -->
		<div class="grid gap-4 lg:grid-cols-3">
			<!-- Colonne 1 : caractéristiques + sauvegardes -->
			<div class="flex flex-col gap-4">
				<section>
					<h2
						class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-widest"
					>
						Caractéristiques
					</h2>
					<div class="grid grid-cols-3 gap-2">
						{#each DND5E_ABILITIES as ab (ab.key)}
							{@render abilityTile(ab.key, ab.label, ab.abbr)}
						{/each}
					</div>
				</section>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Jets de sauvegarde</Card.Title>
					</Card.Header>
					<Card.Content class="pt-0">
						{#each DND5E_ABILITIES as ab (ab.key)}
							{@render profRow(
								ab.label,
								abilityModifier(num(ab.key)) +
									(boolv(`sauvegarde_${ab.key}`) ? prof : 0),
								boolv(`sauvegarde_${ab.key}`),
								() =>
									setVal(`sauvegarde_${ab.key}`, !boolv(`sauvegarde_${ab.key}`))
							)}
						{/each}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Colonne 2 : compétences -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-base">Compétences</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0">
					{#each DND5E_SKILLS as sk (sk.key)}
						{@render profRow(
							sk.label,
							skillBonus(num(sk.ability), boolv(sk.key), prof),
							boolv(sk.key),
							() => setVal(sk.key, !boolv(sk.key)),
							DND5E_ABILITIES.find((a) => a.key === sk.ability)?.abbr
						)}
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Colonne 3 : sorts + bourse -->
			<div class="flex flex-col gap-4">
				{#if spellSlots.length > 0}
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-base">Emplacements de sorts</Card.Title>
						</Card.Header>
						<Card.Content class="grid grid-cols-2 gap-2 pt-0">
							{#each spellSlots as s (s.lvl)}
								<div
									class="flex items-center gap-2 rounded-lg border px-3 py-2"
								>
									<span class="text-muted-foreground text-xs">Niv {s.lvl}</span>
									<input
										type="number"
										aria-label="Emplacements niv {s.lvl} disponibles"
										value={s.current}
										oninput={(e) =>
											setResource(
												`spell_slots_${s.lvl}`,
												"current",
												e.currentTarget.value
											)}
										class="focus-visible:ring-ring/50 ml-auto w-10 rounded-md border bg-background text-center text-sm outline-none focus-visible:ring-[3px]"
									/>
									<span class="text-muted-foreground text-sm">/ {s.max}</span>
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/if}

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Bourse</Card.Title>
					</Card.Header>
					<Card.Content class="grid grid-cols-5 gap-1.5 pt-0">
						{#each coins as c (c.key)}
							{#if has(c.key)}
								<div class="flex flex-col items-center gap-1">
									<input
										type="number"
										aria-label={c.abbr}
										value={num(c.key)}
										oninput={(e) =>
											setVal(c.key, Number(e.currentTarget.value))}
										class="focus-visible:ring-ring/50 w-full rounded-md border bg-background py-1 text-center text-sm outline-none focus-visible:ring-[3px]"
									/>
									<span class="text-muted-foreground text-[10px] font-semibold">
										{c.abbr}
									</span>
								</div>
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Sections narratives -->
		{#if detailGroups.length > 0}
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				{#each detailGroups as [groupName, fields] (groupName)}
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-base">{groupName}</Card.Title>
						</Card.Header>
						<Card.Content class="grid grid-cols-1 gap-4 pt-0">
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
	{/if}
</div>
