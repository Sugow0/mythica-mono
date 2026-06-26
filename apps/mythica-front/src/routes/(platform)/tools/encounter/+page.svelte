<script lang="ts">
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import UsersIcon from "@lucide/svelte/icons/users";
	import { Button } from "$lib/components/ui/button";

	const monsters = [
		{ name: "Gobelin", cr: "1/4", xp: 50, type: "Humanoïde" },
		{ name: "Ogre", cr: "2", xp: 450, type: "Géant" },
		{ name: "Dragon Rouge Adulte", cr: "17", xp: 18000, type: "Dragon" },
		{ name: "Squelette", cr: "1/4", xp: 50, type: "Mort-vivant" },
		{ name: "Troll", cr: "5", xp: 1800, type: "Géant" },
	];
</script>

<div class="mx-auto max-w-6xl px-4 py-12">
	<div class="mb-8 flex flex-col items-center text-center">
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/20 dark:from-slate-600 dark:to-slate-800"
		>
			<ShieldIcon class="h-8 w-8 text-white" />
		</div>
		<h1
			class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
		>
			Générateur de Rencontres
		</h1>
		<p class="mt-4 max-w-2xl text-lg text-slate-600 dark:text-muted-foreground">
			Concevez et équilibrez des combats épiques pour vos joueurs. Calculez
			instantanément la difficulté en fonction du niveau du groupe.
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-12">
		<!-- Party Setup -->
		<div class="lg:col-span-3 space-y-6">
			<div
				class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
			>
				<h2
					class="mb-4 font-bold flex items-center gap-2 text-slate-900 dark:text-white"
				>
					<UsersIcon class="h-5 w-5 text-red-500" />
					Le Groupe (PJ)
				</h2>

				<div class="space-y-3">
					<div
						class="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-muted/50"
					>
						<div>
							<span
								class="block text-sm font-medium text-slate-900 dark:text-white"
								>Niveau moyen</span
							>
							<span class="text-xs text-slate-500"
								>Niveau de base pour le calcul</span
							>
						</div>
						<input
							type="number"
							value="5"
							class="w-16 rounded-md border border-slate-200 px-2 py-1 text-center outline-none focus:border-red-500 dark:border-border dark:bg-background"
						/>
					</div>

					<div
						class="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-muted/50"
					>
						<div>
							<span
								class="block text-sm font-medium text-slate-900 dark:text-white"
								>Nombre de joueurs</span
							>
							<span class="text-xs text-slate-500">Taille du groupe</span>
						</div>
						<input
							type="number"
							value="4"
							class="w-16 rounded-md border border-slate-200 px-2 py-1 text-center outline-none focus:border-red-500 dark:border-border dark:bg-background"
						/>
					</div>
				</div>
			</div>

			<div
				class="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-border dark:bg-muted/30"
			>
				<h3
					class="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500"
				>
					Résumé de la difficulté
				</h3>
				<div class="text-3xl font-black text-red-600 mb-2">Mortel</div>
				<p class="text-sm text-slate-600 dark:text-muted-foreground">
					XP Total : <strong>18 900</strong><br />
					XP Ajusté : <strong>28 350</strong>
				</p>
				<p class="mt-4 text-xs text-slate-500 italic">
					Attention : Cette rencontre risque de tuer un ou plusieurs
					personnages.
				</p>
			</div>
		</div>

		<!-- Encounter Builder Workspace -->
		<div class="lg:col-span-9">
			<div
				class="flex h-[600px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card overflow-hidden"
			>
				<!-- Header -->
				<div
					class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-border/50 dark:bg-muted/50"
				>
					<h2
						class="font-bold text-slate-900 dark:text-white flex items-center gap-2"
					>
						<SwordsIcon class="h-5 w-5 text-slate-400" />
						Monstres de la rencontre
					</h2>
					<div class="relative">
						<input
							type="text"
							placeholder="Rechercher un monstre..."
							class="w-64 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm outline-none focus:border-red-500 dark:border-border dark:bg-background"
						/>
					</div>
				</div>

				<!-- Main area split: Bestiary vs Current Encounter -->
				<div
					class="flex flex-1 divide-x divide-slate-100 dark:divide-border/50"
				>
					<!-- Bestiary -->
					<div
						class="flex-1 overflow-y-auto bg-slate-50/50 p-4 dark:bg-transparent"
					>
						<h3 class="mb-4 text-sm font-semibold text-slate-500">
							Bestiaire (Glissez-déposez)
						</h3>
						<div class="space-y-2">
							{#each monsters as monster}
								<div
									class="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-red-300 hover:shadow-md dark:border-border dark:bg-background"
								>
									<div>
										<div
											class="font-medium text-slate-900 dark:text-white group-hover:text-red-600 transition-colors"
										>
											{monster.name}
										</div>
										<div class="text-xs text-slate-500">
											{monster.type} • CR {monster.cr}
										</div>
									</div>
									<div class="text-right text-xs font-semibold text-slate-400">
										{monster.xp} XP
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Current Encounter -->
					<div
						class="flex-1 overflow-y-auto p-4 bg-red-50/30 dark:bg-red-950/5"
					>
						<h3
							class="mb-4 text-sm font-semibold text-slate-900 dark:text-white"
						>
							Rencontre active
						</h3>

						<!-- Example of dropped monster -->
						<div
							class="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-white p-3 shadow-sm dark:border-red-900/30 dark:bg-card"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 font-bold text-red-700 dark:bg-red-900/50 dark:text-red-400"
								>
									1
								</div>
								<div>
									<div class="font-medium text-slate-900 dark:text-white">
										Dragon Rouge Adulte
									</div>
									<div class="text-xs text-slate-500">CR 17 • 18 000 XP</div>
								</div>
							</div>
							<button class="text-slate-400 hover:text-red-600">×</button>
						</div>

						<div
							class="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 font-bold text-slate-700 dark:bg-muted dark:text-slate-300"
								>
									4
								</div>
								<div>
									<div class="font-medium text-slate-900 dark:text-white">
										Gobelin
									</div>
									<div class="text-xs text-slate-500">CR 1/4 • 50 XP</div>
								</div>
							</div>
							<button class="text-slate-400 hover:text-red-600">×</button>
						</div>

						<!-- Empty drop zone hint -->
						<div
							class="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-12 text-center dark:border-border"
						>
							<SwordsIcon class="mb-3 h-8 w-8 text-slate-400" />
							<span
								class="text-sm font-medium text-slate-600 dark:text-slate-400"
								>Glissez des monstres ici</span
							>
						</div>
					</div>
				</div>

				<!-- Footer Actions -->
				<div
					class="border-t border-slate-100 bg-white px-6 py-4 dark:border-border/50 dark:bg-card flex justify-end gap-3"
				>
					<Button variant="outline">Sauvegarder</Button>
					<Button class="bg-red-600 hover:bg-red-700 text-white"
						>Lancer le combat</Button
					>
				</div>
			</div>
		</div>
	</div>
</div>
