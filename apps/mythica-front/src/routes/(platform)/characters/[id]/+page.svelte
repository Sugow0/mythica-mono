<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CheckIcon from "@lucide/svelte/icons/check";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SparkleIcon from "@lucide/svelte/icons/sparkles";
	import SquarePenIcon from "@lucide/svelte/icons/square-pen";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import WandSparklesIcon from "@lucide/svelte/icons/wand-sparkles";
	import { onMount, type Snippet } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import type {
		CharacterSheetDetail,
		CharacterSheetField,
	} from "$lib/api/services/character-service";
	import AvatarCropper from "$lib/components/character-builder/avatar-cropper.svelte";
	import FieldRenderer from "$lib/components/field-renderer.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { ApiError, characterService } from "$lib/index.js";
	import * as m from "$lib/paraglide/messages.js";
	import { debounce } from "$lib/utils/debounce";
	import { preparedSpellsForKind } from "@mythica/character-engine/dnd5e";
	import {
		abilityModifier,
		DND5E_ABILITIES,
		DND5E_SKILLS,
		formatModifier,
		groupSpellsByLevel,
		hitDiceEntries,
		parseWeaponDamage,
		proficiencyBonusForLevel,
		skillBonus,
		type Spell,
		spellAttackBonus,
		spellSaveDc,
		weaponAbilityKey,
	} from "$lib/utils/dnd5e";

	const sheetId = $derived(page.params.id ?? "");

	let sheet = $state<CharacterSheetDetail | null>(null);
	let values = $state<Record<string, unknown>>({});
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");
	let avatarUrl = $state<string | null>(null);
	let avatarUploading = $state(false);
	let deleteOpen = $state(false);
	let deleting = $state(false);
	/** Fiche en lecture seule par défaut ; le bouton « Modifier » déverrouille. */
	let editing = $state(false);

	/** Le visiteur est-il le propriétaire ? (les fiches publiques sont visibles par tous) */
	const isOwner = $derived(sheet?.isOwner ?? true);

	/** Visibilité courante (privée / campagne / publique). */
	const visibility = $derived(sheet?.visibility ?? "private");
	const VISIBILITY_LABELS: Record<string, string> = {
		private: "Privée",
		campaign: "Campagne",
		public: "Publique",
	};
	async function setVisibility(v: "private" | "campaign" | "public") {
		if (!sheet) return;
		const prev = sheet.visibility;
		sheet = { ...sheet, visibility: v };
		try {
			await characterService.setVisibility(sheetId, v);
		} catch {
			sheet = { ...sheet, visibility: prev };
		}
	}

	/** Contenu joint (par slug) : sorts, classes, équipement — pour l'affichage. */
	type SpellData = { name: string; level: number; school?: string };
	type ClassData = {
		spellcastingAbility?: string;
		spellcasting?: { kind?: string; ability?: string };
	};
	type EquipData = {
		category?: string;
		properties?: { degats?: string; proprietes?: string };
	};
	let spellContent = $state<Record<string, SpellData>>({});
	let classContent = $state<Record<string, ClassData>>({});
	let equipContent = $state<Record<string, EquipData>>({});

	/** Sélections de build résolues (race, classe, sous-classe, historique…). */
	const selections = $derived(sheet?.selections ?? []);
	const raceName = $derived(
		selections.find((s) => s.collectionKey === "race")?.name ?? null
	);
	const backgroundName = $derived(
		selections.find((s) => s.collectionKey === "background")?.name ?? null
	);
	/** Classes (+ niveau), classe principale en tête. */
	const classLine = $derived.by(() => {
		const classes = selections
			.filter((s) => s.collectionKey === "classe")
			.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
		if (classes.length === 0) return null;
		return classes
			.map((c) => (c.level ? `${c.name} ${c.level}` : c.name))
			.join(" / ");
	});
	const subclassNames = $derived(
		selections
			.filter((s) => s.collectionKey === "sous-classe")
			.map((s) => s.name)
	);

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

	// — Expertise (double maîtrise) : liste de clés de compétences —
	const expertSkills = $derived.by<string[]>(() => {
		const raw = val("expertises");
		return Array.isArray(raw) ? (raw as string[]) : [];
	});
	const isExpert = (key: string) => expertSkills.includes(key);

	// — Dés de vie (groupés par taille, multiclasse compris) —
	const hitDice = $derived(hitDiceEntries(val("des_de_vie")));
	function setHitDie(size: number, part: "current" | "max", raw: string) {
		const cur = (val("des_de_vie") ?? {}) as Record<
			string,
			{ current?: number; max?: number }
		>;
		const key = String(size);
		const entry = { current: 0, max: 0, ...(cur[key] ?? {}) };
		entry[part] = raw === "" ? 0 : Number(raw);
		setVal("des_de_vie", { ...cur, [key]: entry });
	}

	// — Sorts connus/préparés (join sélections ↔ contenu), groupés par niveau —
	const spellRole = $derived.by(() => {
		const map: Record<string, string> = {};
		for (const s of selections) {
			if (s.collectionKey !== "sort") continue;
			const role = (s.extra as { role?: string } | null)?.role;
			if (role) map[s.slug] = role;
		}
		return map;
	});
	const spellList = $derived.by<Spell[]>(() =>
		selections
			.filter((s) => s.collectionKey === "sort")
			.map((s) => {
				const c = spellContent[s.slug];
				return {
					id: s.slug,
					name: s.name ?? c?.name ?? s.slug,
					level: Number(c?.level ?? 0),
				};
			})
	);
	const spellGroups = $derived(groupSpellsByLevel(spellList));
	const roleLabel: Record<string, string> = {
		cantrip: "Tour",
		spell: "Préparé",
		book: "Grimoire",
	};

	// — Magie : DD, bonus d'attaque, sorts à préparer par classe lanceuse —
	type CasterInfo = {
		name: string;
		abbr: string;
		dc: number;
		attack: number;
		prepared: number | null;
	};
	const casterClasses = $derived.by<CasterInfo[]>(() => {
		const out: CasterInfo[] = [];
		for (const s of selections.filter((c) => c.collectionKey === "classe")) {
			const data = classContent[s.slug];
			const sc = data?.spellcasting;
			const ability = data?.spellcastingAbility ?? sc?.ability;
			if (!ability) continue;
			const mod = abilityModifier(num(ability));
			const lvl = Number(s.level ?? 1);
			const prepared = preparedSpellsForKind(sc?.kind, mod, lvl);
			out.push({
				name: s.name ?? s.slug,
				abbr: DND5E_ABILITIES.find((a) => a.key === ability)?.abbr ?? "",
				dc: spellSaveDc(mod, prof),
				attack: spellAttackBonus(mod, prof),
				prepared,
			});
		}
		return out;
	});

	// — Attaques (hybride : armes équipées pré-remplies + entrées custom) —
	type Attack = {
		name: string;
		ability: string;
		proficient: boolean;
		damageDice: string;
		damageType: string;
		magicBonus: number;
		custom?: boolean;
	};
	const weaponDefaults = $derived.by<Attack[]>(() =>
		selections
			.filter((s) => s.collectionKey === "equipement")
			.flatMap((s) => {
				const data = equipContent[s.slug];
				if (!data || data.category !== "arme") return [];
				const props = data.properties ?? {};
				const dmg = parseWeaponDamage(props.degats);
				const ability = weaponAbilityKey(props.proprietes, {
					force: num("force"),
					dexterite: num("dexterite"),
				});
				return [
					{
						name: s.name ?? s.slug,
						ability,
						proficient: true,
						damageDice: dmg.dice,
						damageType: dmg.type,
						magicBonus: 0,
					},
				];
			})
	);
	const storedAttacks = $derived.by<Attack[]>(() => {
		const raw = val("attaques");
		return Array.isArray(raw) ? (raw as Attack[]) : [];
	});
	/** Attaques affichées : valeur enregistrée si présente, sinon armes équipées. */
	const attacks = $derived(
		storedAttacks.length > 0 ? storedAttacks : weaponDefaults
	);
	function saveAttacks(list: Attack[]) {
		setVal("attaques", list);
	}
	function updateAttack(i: number, patch: Partial<Attack>) {
		saveAttacks(attacks.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
	}
	function addCustomAttack() {
		saveAttacks([
			...attacks,
			{
				name: "Nouvelle attaque",
				ability: "",
				proficient: false,
				damageDice: "",
				damageType: "",
				magicBonus: 0,
				custom: true,
			},
		]);
	}
	function removeAttack(i: number) {
		saveAttacks(attacks.filter((_, idx) => idx !== i));
	}
	/** Bonus d'attaque = mod. de carac (si définie) + maîtrise + bonus magique. */
	function attackBonus(a: Attack): number {
		const mod = a.ability ? abilityModifier(num(a.ability)) : 0;
		return mod + (a.proficient ? prof : 0) + (Number(a.magicBonus) || 0);
	}
	/** Modificateur de dégâts = mod. de carac + bonus magique. */
	function damageMod(a: Attack): number {
		const mod = a.ability ? abilityModifier(num(a.ability)) : 0;
		return mod + (Number(a.magicBonus) || 0);
	}

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
			"attaques",
			"expertises",
			"ameliorations",
			"pv_temporaires",
			...Array.from({ length: 9 }, (_, i) => `spell_slots_${i + 1}`),
			...coins.map((c) => c.key),
		])
	);

	/** Groupes affichés dans la colonne latérale (sous la bourse) plutôt que dans la grille narrative. */
	const asideGroupNames = ["Identité", "Maîtrises"];

	/** Groupes restants (hors clés déjà rendues), indexés et ordonnés. */
	const remainingGroups = $derived.by(() => {
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
		return { order, byGroup };
	});

	/** Cartes Identité / Maîtrises, rangées dans la colonne latérale. */
	const asideGroups = $derived(
		asideGroupNames
			.map((g) => [g, remainingGroups.byGroup[g]] as const)
			.filter(([, fields]) => fields && fields.length > 0)
	);

	/** Sections narratives restantes (hors colonne latérale). */
	const detailGroups = $derived(
		remainingGroups.order
			.filter((g) => !asideGroupNames.includes(g))
			.map((g) => [g, remainingGroups.byGroup[g]] as const)
	);

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
			avatarUrl = response?.avatarUrl ?? null;
			values = Object.fromEntries(
				(response?.properties ?? []).map((p) => [p.propertyId, p.value])
			);
			if (response) await loadContent(response.gameSystemId);
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

	/** Charge le contenu (sorts, classes, équipement) pour la jointure d'affichage. */
	async function loadContent(gameSystemId: string) {
		try {
			const [spells, classes, equip] = await Promise.all([
				characterService.getContent(gameSystemId, "sort"),
				characterService.getContent(gameSystemId, "classe"),
				characterService.getContent(gameSystemId, "equipement"),
			]);
			spellContent = Object.fromEntries(
				spells.items.map((i) => [i.slug, (i.data ?? {}) as SpellData])
			);
			classContent = Object.fromEntries(
				classes.items.map((i) => [i.slug, (i.data ?? {}) as ClassData])
			);
			equipContent = Object.fromEntries(
				equip.items.map((i) => [i.slug, (i.data ?? {}) as EquipData])
			);
		} catch {
			// L'échec de chargement du contenu n'empêche pas l'affichage de la fiche.
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

	async function uploadAvatar(blob: Blob) {
		avatarUploading = true;
		try {
			const res = await characterService.uploadAvatar(sheetId, blob);
			avatarUrl = res.avatarUrl ?? avatarUrl;
		} catch {
			// L'échec d'upload n'altère pas la fiche.
		} finally {
			avatarUploading = false;
		}
	}

	async function confirmDelete() {
		deleting = true;
		try {
			await characterService.deleteCharacterSheet(sheetId);
			await goto("/characters");
		} catch {
			// On garde le dialog ouvert : l'échec ne doit pas passer inaperçu.
			deleting = false;
		}
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
			readonly={!editing}
			oninput={(e) => setVal(key, Number(e.currentTarget.value))}
			class="focus-visible:ring-ring/50 read-only:border-transparent read-only:bg-transparent mt-2 w-12 rounded-md border bg-background py-0.5 text-center text-sm font-medium outline-none focus-visible:ring-[3px]"
		/>
	</div>
{/snippet}

{#snippet profRow(
	label: string,
	total: number,
	active: boolean,
	onToggle: () => void,
	sub?: string,
	expert = false
)}
	<button
		type="button"
		onclick={() => editing && onToggle()}
		aria-pressed={active}
		class="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors {editing
			? 'hover:bg-muted/50'
			: 'cursor-default'}"
	>
		<span
			title={expert ? "Expertise (double maîtrise)" : undefined}
			class="h-3 w-3 shrink-0 rounded-full border-2 transition-colors {expert
				? 'border-amber-500 bg-amber-500'
				: active
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

{#snippet groupCard(
	groupName: string,
	fields: CharacterSheetField[],
	wide = false
)}
	<Card.Root>
		<Card.Header class="pb-2">
			<Card.Title class="text-base">{groupName}</Card.Title>
		</Card.Header>
		<Card.Content
			class="grid grid-cols-1 gap-4 pt-0 {wide ? 'sm:grid-cols-2' : ''}"
		>
			{#each fields as field (field.propertyId)}
				<FieldRenderer
					property={field}
					value={values[field.propertyId]}
					disabled={!editing}
					onChange={(v) => onFieldChange(field.propertyId, v)}
				/>
			{/each}
		</Card.Content>
	</Card.Root>
{/snippet}

{#snippet bourseCard()}
	<Card.Root>
		<Card.Header class="pb-2">
			<Card.Title class="text-base">Bourse</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-wrap gap-2 pt-0">
			{#each coins as c (c.key)}
				{#if has(c.key)}
					<div class="flex w-14 flex-col items-center gap-1">
						<input
							type="number"
							aria-label={c.abbr}
							value={num(c.key)}
							readonly={!editing}
							oninput={(e) => setVal(c.key, Number(e.currentTarget.value))}
							class="focus-visible:ring-ring/50 read-only:border-transparent read-only:bg-transparent w-full rounded-md border bg-background py-1 text-center text-sm outline-none focus-visible:ring-[3px]"
						/>
						<span class="text-muted-foreground text-[10px] font-semibold">
							{c.abbr}
						</span>
					</div>
				{/if}
			{/each}
		</Card.Content>
	</Card.Root>
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
		<!-- En-tête : token, identité, actions -->
		<header
			class="bg-card mb-6 flex flex-col gap-4 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center sm:p-5"
		>
			<AvatarCropper
				currentUrl={avatarUrl}
				fallback={sheet.name.charAt(0).toUpperCase()}
				uploading={avatarUploading}
				size="lg"
				onUpload={uploadAvatar}
			/>

			<div class="min-w-0 flex-1">
				<h1 class="font-display truncate text-3xl font-bold leading-tight">
					{sheet.name}
				</h1>
				<p class="text-muted-foreground mt-0.5 text-sm">{identityLine}</p>

				{#if raceName || classLine || subclassNames.length > 0 || backgroundName}
					<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
						{#if raceName}
							<Badge variant="secondary">{raceName}</Badge>
						{/if}
						{#if classLine}
							<Badge variant="secondary">{classLine}</Badge>
						{/if}
						{#each subclassNames as sub (sub)}
							<Badge variant="outline">{sub}</Badge>
						{/each}
						{#if backgroundName}
							<Badge variant="outline">{backgroundName}</Badge>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-2 sm:flex-col sm:items-end">
				<div class="flex flex-wrap items-center gap-2">
					{#if isOwner}
						{#if has("inspiration")}
							<button
								type="button"
								onclick={() =>
									editing && setVal("inspiration", !boolv("inspiration"))}
								aria-pressed={boolv("inspiration")}
								class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors {boolv(
									'inspiration'
								)
									? 'border-primary bg-primary/10 text-primary'
									: 'text-muted-foreground'} {editing
									? 'hover:bg-muted'
									: 'cursor-default'}"
							>
								<SparkleIcon class="h-4 w-4" /> Inspiration
							</button>
						{/if}
						<select
							aria-label="Visibilité de la fiche"
							value={visibility}
							onchange={(e) =>
								setVisibility(
									e.currentTarget.value as "private" | "campaign" | "public"
								)}
							class="focus-visible:ring-ring/50 h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-[3px]"
							title="Qui peut voir cette fiche"
						>
							<option value="private">🔒 Privée</option>
							<option value="campaign">👥 Campagne</option>
							<option value="public">🌐 Publique</option>
						</select>
						<Button
							variant={editing ? "default" : "outline"}
							size="sm"
							onclick={() => (editing = !editing)}
						>
							{#if editing}
								<CheckIcon class="h-4 w-4" /> Terminer
							{:else}
								<PencilIcon class="h-4 w-4" /> Modifier
							{/if}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							href="/characters/{sheetId}/create"
							title="Modifier la race, la classe, les caractéristiques…"
						>
							<SquarePenIcon class="h-4 w-4" /> Modifier le build
						</Button>
						<Button
							variant="ghost"
							size="icon"
							class="text-muted-foreground hover:text-destructive"
							aria-label="Supprimer le personnage"
							onclick={() => (deleteOpen = true)}
						>
							<Trash2Icon class="h-4 w-4" />
						</Button>
					{:else}
						<Badge variant="secondary">
							Build {VISIBILITY_LABELS[visibility]?.toLowerCase()} — lecture seule
						</Badge>
					{/if}
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
			</div>
		</header>

		<AlertDialog.Root bind:open={deleteOpen}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Supprimer ce personnage ?</AlertDialog.Title>
					<AlertDialog.Description>
						La fiche « {sheet.name} » sera supprimée. Cette action est définitive.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel disabled={deleting}>Annuler</AlertDialog.Cancel>
					<Button
						variant="destructive"
						onclick={confirmDelete}
						disabled={deleting}
					>
						{#if deleting}
							<LoaderIcon class="h-4 w-4 animate-spin" />
						{:else}
							<Trash2Icon class="h-4 w-4" />
						{/if}
						Supprimer
					</Button>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>

		<!-- Rail de constantes (auto-fit : remplit la largeur sans cellules vides) -->
		<div
			class="mb-6 grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3"
		>
			{#if has("ca")}
				{#snippet caVal()}
					<input
						type="number"
						aria-label="Classe d'armure"
						value={num("ca")}
						readonly={!editing}
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
							readonly={!editing}
							oninput={(e) =>
								setResource("hp", "current", e.currentTarget.value)}
							class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-right outline-none focus-visible:ring-[3px]"
						/>
						<span class="text-muted-foreground text-base">/</span>
						<input
							type="number"
							aria-label="PV max"
							value={resource("hp").max}
							readonly={!editing}
							oninput={(e) => setResource("hp", "max", e.currentTarget.value)}
							class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-left outline-none focus-visible:ring-[3px]"
						/>
					</span>
				{/snippet}
				{@render vital("Points de vie", hpVal)}
			{/if}
			{#if has("pv_temporaires")}
				{#snippet tempVal()}
					<input
						type="number"
						aria-label="PV temporaires"
						value={num("pv_temporaires")}
						readonly={!editing}
						oninput={(e) =>
							setVal("pv_temporaires", Number(e.currentTarget.value))}
						class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-center outline-none focus-visible:ring-[3px]"
					/>
				{/snippet}
				{@render vital("PV temporaires", tempVal)}
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
							readonly={!editing}
							oninput={(e) => setVal("vitesse", Number(e.currentTarget.value))}
							class="focus-visible:ring-ring/50 w-12 rounded-md bg-transparent text-center outline-none focus-visible:ring-[3px]"
						/>
						<span class="text-muted-foreground text-sm">m</span>
					</span>
				{/snippet}
				{@render vital("Vitesse", spdVal)}
			{/if}
			{#each hitDice as hd (hd.size)}
				<div
					class="bg-card flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center shadow-xs"
				>
					<span
						class="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest"
					>
						{hd.size > 0 ? `Dés de vie d${hd.size}` : "Dés de vie"}
					</span>
					<div class="font-display mt-1 text-2xl font-bold leading-none">
						<span class="flex items-center justify-center gap-1 text-xl">
							<input
								type="number"
								aria-label="Dés de vie d{hd.size} disponibles"
								value={hd.current}
								readonly={!editing}
								oninput={(e) =>
									setHitDie(hd.size, "current", e.currentTarget.value)}
								class="focus-visible:ring-ring/50 w-10 rounded-md bg-transparent text-right outline-none focus-visible:ring-[3px]"
							/>
							<span class="text-muted-foreground text-base">/</span>
							<input
								type="number"
								aria-label="Dés de vie d{hd.size} max"
								value={hd.max}
								readonly={!editing}
								oninput={(e) =>
									setHitDie(hd.size, "max", e.currentTarget.value)}
								class="focus-visible:ring-ring/50 w-10 rounded-md bg-transparent text-left outline-none focus-visible:ring-[3px]"
							/>
						</span>
					</div>
				</div>
			{/each}
		</div>

		<!-- Attaques (armes équipées pré-remplies + entrées personnalisées) -->
		<Card.Root class="mb-6">
			<Card.Header class="flex-row items-center justify-between pb-2">
				<Card.Title class="flex items-center gap-2 text-base">
					<SwordsIcon class="text-primary h-4 w-4" /> Attaques
				</Card.Title>
				{#if editing}
					<Button variant="outline" size="sm" onclick={addCustomAttack}>
						<PlusIcon class="h-4 w-4" /> Ajouter
					</Button>
				{/if}
			</Card.Header>
			<Card.Content class="pt-0">
				{#if attacks.length === 0}
					<p class="text-muted-foreground text-sm">
						Aucune arme équipée. Ajoutez une attaque (sort, capacité…) au
						besoin.
					</p>
				{:else}
					<!-- En-têtes -->
					<div
						class="text-muted-foreground hidden grid-cols-[1fr_5rem_4rem_4rem_5rem_2rem] gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider sm:grid"
					>
						<span>Nom</span>
						<span>Carac.</span>
						<span class="text-center">Maîtrise</span>
						<span class="text-center">Magie</span>
						<span class="text-right">Attaque</span>
						<span></span>
					</div>
					<ul class="space-y-2">
						{#each attacks as a, i (i)}
							<li
								class="grid grid-cols-2 items-center gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_5rem_4rem_4rem_5rem_2rem]"
							>
								<input
									type="text"
									aria-label="Nom de l'attaque"
									value={a.name}
									readonly={!editing}
									oninput={(e) =>
										updateAttack(i, { name: e.currentTarget.value })}
									class="focus-visible:ring-ring/50 read-only:border-transparent read-only:bg-transparent col-span-2 rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-[3px] sm:col-span-1"
								/>
								<select
									aria-label="Caractéristique"
									value={a.ability}
									disabled={!editing}
									onchange={(e) =>
										updateAttack(i, { ability: e.currentTarget.value })}
									class="focus-visible:ring-ring/50 disabled:opacity-100 rounded-md border bg-background px-1 py-1 text-sm outline-none focus-visible:ring-[3px] disabled:border-transparent disabled:bg-transparent disabled:appearance-none"
								>
									<option value="">—</option>
									{#each DND5E_ABILITIES as ab (ab.key)}
										<option value={ab.key}>{ab.abbr}</option>
									{/each}
								</select>
								<button
									type="button"
									aria-label="Maîtrise"
									aria-pressed={a.proficient}
									onclick={() =>
										editing && updateAttack(i, { proficient: !a.proficient })}
									class="mx-auto h-4 w-4 shrink-0 rounded-full border-2 transition-colors {a.proficient
										? 'border-primary bg-primary'
										: 'border-muted-foreground/40'} {editing
										? ''
										: 'cursor-default'}"
								></button>
								<input
									type="number"
									aria-label="Bonus magique"
									value={a.magicBonus}
									readonly={!editing}
									oninput={(e) =>
										updateAttack(i, {
											magicBonus: Number(e.currentTarget.value),
										})}
									class="focus-visible:ring-ring/50 read-only:border-transparent read-only:bg-transparent w-full rounded-md border bg-background px-1 py-1 text-center text-sm outline-none focus-visible:ring-[3px]"
								/>
								<div class="text-right">
									<span class="font-display font-semibold tabular-nums">
										{formatModifier(attackBonus(a))}
									</span>
									{#if a.damageDice}
										<span class="text-muted-foreground block text-[11px]">
											{a.damageDice}{formatModifier(damageMod(a))}
											{a.damageType}
										</span>
									{/if}
								</div>
								{#if editing}
									<button
										type="button"
										aria-label="Supprimer l'attaque"
										onclick={() => removeAttack(i)}
										class="text-muted-foreground hover:text-destructive mx-auto"
									>
										<Trash2Icon class="h-4 w-4" />
									</button>
								{:else}
									<span></span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Corps : caractéristiques+sauvegardes | compétences -->
		<div class="grid gap-4 lg:grid-cols-2">
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
							skillBonus(
								num(sk.ability),
								boolv(sk.key),
								prof,
								isExpert(sk.key)
							),
							boolv(sk.key),
							() => setVal(sk.key, !boolv(sk.key)),
							DND5E_ABILITIES.find((a) => a.key === sk.ability)?.abbr,
							isExpert(sk.key)
						)}
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Combat & magie : magie, sorts, emplacements, bourse (auto-fit) -->
		<div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
			{#if casterClasses.length > 0}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							<WandSparklesIcon class="text-primary h-4 w-4" /> Magie
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3 pt-0">
						{#each casterClasses as c (c.name)}
							<div class="rounded-lg border p-3">
								<p class="mb-2 text-sm font-semibold">
									{c.name}
									<span class="text-muted-foreground font-normal"
										>· {c.abbr}</span
									>
								</p>
								<div class="grid grid-cols-3 gap-2 text-center">
									<div>
										<p
											class="font-display text-primary text-2xl font-bold leading-none"
										>
											{c.dc}
										</p>
										<p class="text-muted-foreground text-[10px] uppercase">
											DD des sorts
										</p>
									</div>
									<div>
										<p
											class="font-display text-primary text-2xl font-bold leading-none"
										>
											{formatModifier(c.attack)}
										</p>
										<p class="text-muted-foreground text-[10px] uppercase">
											Attaque
										</p>
									</div>
									<div>
										<p class="font-display text-2xl font-bold leading-none">
											{c.prepared ?? "—"}
										</p>
										<p class="text-muted-foreground text-[10px] uppercase">
											À préparer
										</p>
									</div>
								</div>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			{#if spellGroups.length > 0}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Sorts</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3 pt-0">
						{#each spellGroups as group (group.level)}
							<div>
								<h3
									class="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-widest"
								>
									{group.label}
								</h3>
								<ul class="space-y-0.5">
									{#each group.spells as spell (spell.id)}
										<li class="flex items-center gap-2 text-sm">
											<span class="flex-1 truncate">{spell.name}</span>
											{#if roleLabel[spellRole[spell.id]]}
												<Badge variant="outline" class="text-[10px]">
													{roleLabel[spellRole[spell.id]]}
												</Badge>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			{#if spellSlots.length > 0}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Emplacements de sorts</Card.Title>
					</Card.Header>
					<Card.Content class="grid grid-cols-2 gap-2 pt-0">
						{#each spellSlots as s (s.lvl)}
							<div class="flex items-center gap-2 rounded-lg border px-3 py-2">
								<span class="text-muted-foreground text-xs">Niv {s.lvl}</span>
								<input
									type="number"
									aria-label="Emplacements niv {s.lvl} disponibles"
									value={s.current}
									readonly={!editing}
									oninput={(e) =>
										setResource(
											`spell_slots_${s.lvl}`,
											"current",
											e.currentTarget.value
										)}
									class="focus-visible:ring-ring/50 read-only:border-transparent read-only:bg-transparent ml-auto w-10 rounded-md border bg-background text-center text-sm outline-none focus-visible:ring-[3px]"
								/>
								<span class="text-muted-foreground text-sm">/ {s.max}</span>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<!-- Cartes courtes : bourse, identité, maîtrises -->
		<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{@render bourseCard()}
			{#each asideGroups as [groupName, fields] (groupName)}
				{@render groupCard(groupName, fields)}
			{/each}
		</div>

		<!-- Lore : bloc dédié (champs narratifs) -->
		{#if detailGroups.length > 0}
			<div class="mt-4 grid gap-4">
				{#each detailGroups as [groupName, fields] (groupName)}
					{@render groupCard(groupName, fields, true)}
				{/each}
			</div>
		{/if}
	{/if}
</div>
