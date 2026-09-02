<script lang="ts">
	import BoxIcon from "@lucide/svelte/icons/box";
	import DownloadIcon from "@lucide/svelte/icons/download";
	import Rotate3dIcon from "@lucide/svelte/icons/rotate-3d";
	import ShirtIcon from "@lucide/svelte/icons/shirt";
	import SmileIcon from "@lucide/svelte/icons/smile";
	import UserIcon from "@lucide/svelte/icons/user";
	import { Button } from "$lib/components/ui/button";
</script>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-black shadow-lg dark:from-slate-700 dark:to-slate-900"
			>
				<BoxIcon class="h-6 w-6 text-white" />
			</div>
			<div>
				<h1
					class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
				>
					Créateur de Figurines
				</h1>
				<p class="text-sm text-slate-500 dark:text-muted-foreground">
					Personnalisez votre avatar 3D et exportez-le.
				</p>
			</div>
		</div>
		<div class="flex gap-3">
			<Button variant="outline" class="border-slate-300 dark:border-border">
				Sauvegarder
			</Button>
			<Button class="bg-red-600 text-white hover:bg-red-700 shadow-md">
				<DownloadIcon class="mr-2 h-4 w-4" />
				Exporter STL
			</Button>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-12 h-[calc(100vh-200px)] min-h-[600px]">
		<!-- Tools Sidebar -->
		<div class="lg:col-span-3 flex flex-col gap-4">
			<div
				class="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-card"
			>
				<div class="flex flex-col gap-1">
					<button
						class="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-left font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400"
					>
						<UserIcon class="h-5 w-5" /> Race & Corps
					</button>
					<button
						class="flex items-center gap-3 rounded-lg p-3 text-left font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-muted"
					>
						<SmileIcon class="h-5 w-5" /> Tête & Visage
					</button>
					<button
						class="flex items-center gap-3 rounded-lg p-3 text-left font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-muted"
					>
						<ShirtIcon class="h-5 w-5" /> Équipement
					</button>
					<button
						class="flex items-center gap-3 rounded-lg p-3 text-left font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-muted"
					>
						<BoxIcon class="h-5 w-5" /> Socle
					</button>
				</div>
			</div>

			<div
				class="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card overflow-y-auto"
			>
				<h3
					class="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500"
				>
					Sélection de Race
				</h3>
				<div class="grid grid-cols-2 gap-2">
					{#each ["Humain", "Elfe", "Nain", "Orc", "Tieffelin", "Gnome"] as race, i}
						<button
							class="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border {i ===
							0
								? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
								: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-border dark:bg-muted/50 dark:text-slate-400 dark:hover:border-slate-600'} transition-all"
						>
							<UserIcon class="h-8 w-8" />
							<span class="text-xs font-semibold">{race}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- 3D Canvas Placeholder -->
		<div
			class="lg:col-span-9 relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner dark:border-border dark:bg-slate-900/50"
		>
			<!-- Controls overlay -->
			<div class="absolute right-4 top-4 flex flex-col gap-2 z-10">
				<button
					class="rounded-full bg-white p-3 text-slate-600 shadow-md transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-card dark:text-slate-300 dark:hover:text-red-400"
				>
					<Rotate3dIcon class="h-5 w-5" />
				</button>
			</div>

			<!-- Mockup visual -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="relative flex h-full w-full items-center justify-center">
					<!-- Fake pedestal -->
					<div
						class="absolute bottom-1/4 h-32 w-64 rounded-[100%] border-t border-slate-300 bg-gradient-to-b from-slate-200 to-slate-400 shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:border-slate-700 dark:from-slate-800 dark:to-black"
					></div>
					<!-- Fake model outline -->
					<div
						class="absolute bottom-1/4 mb-16 h-80 w-32 animate-pulse bg-gradient-to-t from-slate-400 to-slate-300 opacity-50 blur-[2px] dark:from-slate-700 dark:to-slate-600"
						style="clip-path: polygon(50% 0%, 80% 20%, 90% 50%, 70% 100%, 30% 100%, 10% 50%, 20% 20%);"
					></div>

					<div class="z-10 text-center">
						<BoxIcon class="mx-auto mb-4 h-16 w-16 text-slate-400 opacity-50" />
						<p class="font-medium text-slate-500">
							Moteur 3D (WebGL) bientôt disponible
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
