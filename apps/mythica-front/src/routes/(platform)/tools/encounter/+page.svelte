<script lang="ts">
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SearchIcon from "@lucide/svelte/icons/search";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import UsersIcon from "@lucide/svelte/icons/users";
	import XIcon from "@lucide/svelte/icons/x";
	import { onMount } from "svelte";
	import { characterService, gameSystemService } from "$lib/index.js";
	import { debounce } from "$lib/utils/debounce";

	// ── Types ───────────────────────────────────────────────────────────────────
	type GameSystem = { id: string; nom: string; slug: string };

	type MonsterData = {
		cr?: string;
		xp?: number;
		type?: string;
		taille?: string;
		alignement?: string;
		pv?: number;
		ca?: number;
		[key: string]: unknown;
	};

	type Monster = {
		id: string;
		slug: string;
		name: string;
		description: string | null;
		data: MonsterData;
	};

	type EncounterEntry = {
		monster: Monster;
		quantity: number;
	};

	// ── State ───────────────────────────────────────────────────────────────────
	let gameSystems = $state<GameSystem[]>([]);
	let selectedGameSystemId = $state("");
	let monsters = $state<Monster[]>([]);
	let total = $state(0);
	let searchQuery = $state("");
	let loadingMonsters = $state(false);
	let encounter = $state<EncounterEntry[]>([]);
	let partySize = $state(4);
	let partyLevel = $state(5);

	// ── XP Thresholds D&D 5e ────────────────────────────────────────────────────
	const XP_THRESHOLDS: Record<number, [number, number, number, number]> = {
		1: [25, 50, 75, 100],
		2: [50, 100, 150, 200],
		3: [75, 150, 225, 400],
		4: [125, 250, 375, 500],
		5: [250, 500, 750, 1100],
		6: [300, 600, 900, 1400],
		7: [350, 750, 1100, 1700],
		8: [450, 900, 1400, 2100],
		9: [550, 1100, 1600, 2400],
		10: [600, 1200, 1900, 2800],
		11: [800, 1600, 2400, 3600],
		12: [1000, 2000, 3000, 4500],
		13: [1100, 2200, 3400, 5100],
		14: [1250, 2500, 3800, 5700],
		15: [1400, 2800, 4300, 6400],
		16: [1600, 3200, 4800, 7200],
		17: [2000, 3900, 5900, 8800],
		18: [2100, 4200, 6300, 9500],
		19: [2400, 4900, 7300, 10900],
		20: [2800, 5700, 8500, 12700],
	};

	const MULTIPLIERS: [number, number][] = [
		[1, 1],
		[2, 1.5],
		[7, 2],
		[11, 2.5],
		[15, 3],
		[Infinity, 4],
	];

	function getMultiplier(count: number): number {
		for (const [threshold, mult] of MULTIPLIERS) {
			if (count <= threshold) return mult;
		}
		return 4;
	}

	function crToXp(cr: string | undefined): number {
		if (!cr) return 0;
		const CrMap: Record<string, number> = {
			"0": 10,
			"1/8": 25,
			"1/4": 50,
			"1/2": 100,
			"1": 200,
			"2": 450,
			"3": 700,
			"4": 1100,
			"5": 1800,
			"6": 2300,
			"7": 2900,
			"8": 3900,
			"9": 5000,
			"10": 5900,
			"11": 7200,
			"12": 8400,
			"13": 10000,
			"14": 11500,
			"15": 13000,
			"16": 15000,
			"17": 18000,
			"18": 20000,
			"19": 22000,
			"20": 25000,
			"21": 33000,
			"22": 41000,
			"23": 50000,
			"24": 62000,
			"25": 75000,
			"26": 90000,
			"27": 105000,
			"28": 120000,
			"29": 135000,
			"30": 155000,
		};
		return CrMap[cr] ?? 0;
	}

	// ── Derived difficulty ───────────────────────────────────────────────────────
	const totalXp = $derived(
		encounter.reduce(
			(sum, e) => sum + crToXp(e.monster.data?.cr) * e.quantity,
			0
		)
	);

	const adjustedXp = $derived(() => {
		const monsterCount = encounter.reduce((s, e) => s + e.quantity, 0);
		return Math.round(totalXp * getMultiplier(monsterCount));
	});

	const difficultyLabel = $derived(() => {
		const thresholds = XP_THRESHOLDS[Math.min(Math.max(partyLevel, 1), 20)];
		if (!thresholds) return { label: "—", color: "text-muted-foreground" };
		const [easy, med, hard, deadly] = thresholds.map((t) => t * partySize);
		const adj = adjustedXp();
		if (adj === 0) return { label: "Vide", color: "text-muted-foreground" };
		if (adj < easy) return { label: "Triviale", color: "text-blue-500" };
		if (adj < med) return { label: "Facile", color: "text-green-500" };
		if (adj < hard) return { label: "Moyenne", color: "text-yellow-500" };
		if (adj < deadly) return { label: "Difficile", color: "text-orange-500" };
		return { label: "Mortelle", color: "text-red-600" };
	});

	// ── Chargement ──────────────────────────────────────────────────────────────
	onMount(async () => {
		const res = await gameSystemService.getGameSystems({ limit: 100 });
		gameSystems = (res.items ?? []) as GameSystem[];
		if (gameSystems.length > 0) selectedGameSystemId = gameSystems[0].id;
	});

	async function loadMonsters(q = "") {
		if (!selectedGameSystemId) return;
		loadingMonsters = true;
		try {
			const res = await characterService.getContent(
				selectedGameSystemId,
				"monstre",
				{
					q: q || undefined,
					limit: 80,
					offset: 0,
				}
			);
			monsters = (res.items ?? []) as Monster[];
			total = (res as { total?: number }).total ?? monsters.length;
		} catch {
			monsters = [];
		} finally {
			loadingMonsters = false;
		}
	}

	// Reload when game system changes
	$effect(() => {
		if (selectedGameSystemId) loadMonsters(searchQuery);
	});

	const debouncedSearch = debounce((q: string) => loadMonsters(q), 350);

	function onSearch(e: Event) {
		searchQuery = (e.target as HTMLInputElement).value;
		debouncedSearch(searchQuery);
	}

	// ── Encounter management ─────────────────────────────────────────────────────
	function addMonster(monster: Monster) {
		const existing = encounter.find((e) => e.monster.id === monster.id);
		if (existing) {
			existing.quantity += 1;
		} else {
			encounter = [...encounter, { monster, quantity: 1 }];
		}
	}

	function removeOne(idx: number) {
		if (encounter[idx].quantity > 1) {
			encounter[idx].quantity -= 1;
		} else {
			encounter = encounter.filter((_, i) => i !== idx);
		}
	}

	function removeAll(idx: number) {
		encounter = encounter.filter((_, i) => i !== idx);
	}

	function clearEncounter() {
		encounter = [];
	}

	// ── Drag & drop ─────────────────────────────────────────────────────────────
	let draggedMonster = $state<Monster | null>(null);

	function onDragStart(e: DragEvent, monster: Monster) {
		draggedMonster = monster;
		e.dataTransfer?.setData("text/plain", monster.id);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		if (draggedMonster) {
			addMonster(draggedMonster);
			draggedMonster = null;
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-10">
	<!-- Header -->
	<div class="mb-8 flex flex-col items-center text-center">
		<div
			class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-900/30"
		>
			<ShieldIcon class="h-7 w-7 text-white" />
		</div>
		<h1 class="text-3xl font-bold tracking-tight text-foreground">
			Générateur de Rencontres
		</h1>
		<p class="mt-3 max-w-xl text-base text-muted-foreground">
			Construisez des combats épiques depuis le bestiaire importé. La difficulté
			est calculée selon les règles D&D 5e.
		</p>
	</div>

	<!-- System selector -->
	{#if gameSystems.length > 1}
		<div class="mb-6 flex justify-center">
			<div
				class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-sm"
			>
				<span class="text-sm font-medium text-muted-foreground"
					>Système de jeu :</span
				>
				<select
					bind:value={selectedGameSystemId}
					class="bg-transparent text-sm font-semibold text-foreground outline-none"
				>
					{#each gameSystems as gs (gs.id)}
						<option value={gs.id}>{gs.nom}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-12">
		<!-- Party config + Difficulty -->
		<div class="lg:col-span-3 space-y-4">
			<div class="rounded-xl border border-border bg-card p-5 shadow-sm">
				<h2 class="mb-4 flex items-center gap-2 font-bold text-foreground">
					<UsersIcon class="h-5 w-5 text-primary" />
					Le Groupe (PJ)
				</h2>
				<div class="space-y-3">
					<div
						class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5"
					>
						<div>
							<span class="block text-sm font-medium text-foreground"
								>Niveau moyen</span
							>
							<span class="text-xs text-muted-foreground"
								>Pour le seuil de difficulté</span
							>
						</div>
						<input
							type="number"
							bind:value={partyLevel}
							min="1"
							max="20"
							class="w-14 rounded-md border border-input bg-background px-2 py-1 text-center text-sm font-semibold outline-none focus:border-primary"
						/>
					</div>
					<div
						class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5"
					>
						<div>
							<span class="block text-sm font-medium text-foreground"
								>Nb joueurs</span
							>
							<span class="text-xs text-muted-foreground">Taille du groupe</span
							>
						</div>
						<input
							type="number"
							bind:value={partySize}
							min="1"
							max="10"
							class="w-14 rounded-md border border-input bg-background px-2 py-1 text-center text-sm font-semibold outline-none focus:border-primary"
						/>
					</div>
				</div>
			</div>

			<!-- Difficulty summary -->
			<div class="rounded-xl border border-border bg-card p-5 shadow-sm">
				<h3
					class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
				>
					Difficulté estimée
				</h3>
				<div class="text-2xl font-black {difficultyLabel().color} mb-2">
					{difficultyLabel().label}
				</div>
				<div class="space-y-1 text-sm text-muted-foreground">
					<div class="flex justify-between">
						<span>XP brut</span>
						<span class="font-semibold tabular-nums text-foreground"
							>{totalXp.toLocaleString("fr-FR")}</span
						>
					</div>
					<div class="flex justify-between">
						<span>XP ajusté</span>
						<span class="font-semibold tabular-nums text-foreground"
							>{adjustedXp().toLocaleString("fr-FR")}</span
						>
					</div>
					<div class="flex justify-between">
						<span>Monstres</span>
						<span class="font-semibold tabular-nums text-foreground"
							>{encounter.reduce((s, e) => s + e.quantity, 0)}</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Main builder -->
		<div class="lg:col-span-9">
			<div
				class="flex h-[620px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
			>
				<!-- Header with search -->
				<div
					class="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3"
				>
					<h2 class="flex items-center gap-2 font-bold text-foreground">
						<SwordsIcon class="h-5 w-5 text-muted-foreground" />
						Bestiaire
						{#if total > 0}
							<span
								class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
							>
								{total}
							</span>
						{/if}
					</h2>
					<div class="relative">
						<SearchIcon
							class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<input
							type="text"
							placeholder="Rechercher un monstre..."
							value={searchQuery}
							oninput={onSearch}
							class="w-60 rounded-full border border-input bg-background py-1.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
						/>
					</div>
				</div>

				<!-- Split: bestiary | encounter -->
				<div class="flex flex-1 divide-x divide-border overflow-hidden">
					<!-- Bestiary -->
					<div class="flex-1 overflow-y-auto p-4">
						{#if loadingMonsters}
							<div
								class="flex h-full items-center justify-center text-muted-foreground"
							>
								<LoaderIcon class="h-5 w-5 animate-spin" />
							</div>
						{:else if monsters.length === 0 && selectedGameSystemId}
							<div
								class="flex h-full flex-col items-center justify-center gap-2 text-center"
							>
								<ShieldIcon class="h-10 w-10 text-muted-foreground/40" />
								<p class="text-sm text-muted-foreground">
									{searchQuery
										? "Aucun monstre trouvé"
										: "Aucun monstre importé pour ce système"}
								</p>
								<p class="text-xs text-muted-foreground/60">
									Importez des monstres depuis l'interface admin → Import de
									contenu
								</p>
							</div>
						{:else if !selectedGameSystemId}
							<p class="text-sm text-muted-foreground text-center mt-8">
								Sélectionnez un système de jeu
							</p>
						{:else}
							<div class="space-y-1.5">
								{#each monsters as monster (monster.id)}
									<div
										class="group flex cursor-grab items-center justify-between rounded-lg border border-border bg-background p-3 transition-all hover:border-primary/40 hover:shadow-sm active:cursor-grabbing"
										draggable="true"
										ondragstart={(e) => onDragStart(e, monster)}
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === "Enter" && addMonster(monster)}
										onclick={() => addMonster(monster)}
									>
										<div class="min-w-0">
											<div
												class="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors"
											>
												{monster.name}
											</div>
											<div
												class="flex gap-2 text-xs text-muted-foreground mt-0.5"
											>
												{#if monster.data?.type}
													<span>{monster.data.type}</span>
												{/if}
												{#if monster.data?.cr !== undefined}
													<span class="font-medium">CR {monster.data.cr}</span>
												{/if}
												{#if monster.data?.xp}
													<span class="tabular-nums"
														>{monster.data.xp.toLocaleString("fr-FR")} XP</span
													>
												{:else if monster.data?.cr}
													<span class="tabular-nums text-muted-foreground/60"
														>{crToXp(monster.data.cr).toLocaleString("fr-FR")} XP</span
													>
												{/if}
											</div>
										</div>
										<button
											class="ml-3 flex-shrink-0 rounded-md bg-primary/10 p-1.5 text-primary opacity-0 transition-opacity group-hover:opacity-100"
											onclick={(e) => {
												e.stopPropagation();
												addMonster(monster);
											}}
											aria-label="Ajouter {monster.name}"
										>
											<PlusIcon class="h-3.5 w-3.5" />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Encounter builder -->
					<div
						class="flex w-80 flex-col bg-red-50/20 dark:bg-red-950/5"
						ondrop={onDrop}
						ondragover={onDragOver}
						role="region"
						aria-label="Zone de rencontre"
					>
						<div
							class="flex items-center justify-between border-b border-border/50 px-4 py-2.5"
						>
							<h3 class="text-sm font-semibold text-foreground">
								Rencontre active
							</h3>
							{#if encounter.length > 0}
								<button
									class="text-xs text-muted-foreground hover:text-destructive transition-colors"
									onclick={clearEncounter}
								>
									Vider
								</button>
							{/if}
						</div>

						<div class="flex-1 overflow-y-auto p-3">
							{#if encounter.length === 0}
								<div
									class="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center"
								>
									<SwordsIcon class="mb-3 h-8 w-8 text-muted-foreground/40" />
									<span class="text-sm font-medium text-muted-foreground">
										Cliquez ou glissez des monstres ici
									</span>
								</div>
							{:else}
								<div class="space-y-2">
									{#each encounter as entry, idx (entry.monster.id)}
										<div
											class="flex items-center gap-2 rounded-lg border border-red-200/60 bg-card p-2.5 shadow-sm dark:border-red-900/20"
										>
											<div
												class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-red-100 text-sm font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400"
											>
												{entry.quantity}
											</div>
											<div class="min-w-0 flex-1">
												<div
													class="truncate text-sm font-medium text-foreground"
												>
													{entry.monster.name}
												</div>
												<div class="text-xs text-muted-foreground">
													CR {entry.monster.data?.cr ?? "?"} •
													{(
														crToXp(entry.monster.data?.cr) * entry.quantity
													).toLocaleString("fr-FR")} XP
												</div>
											</div>
											<div class="flex flex-shrink-0 items-center gap-1">
												<button
													class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
													onclick={() => removeOne(idx)}
													aria-label="Retirer un"
												>
													<MinusIcon class="h-3 w-3" />
												</button>
												<button
													class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
													onclick={() => addMonster(entry.monster)}
													aria-label="En ajouter un"
												>
													<PlusIcon class="h-3 w-3" />
												</button>
												<button
													class="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
													onclick={() => removeAll(idx)}
													aria-label="Retirer tous"
												>
													<XIcon class="h-3 w-3" />
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
