<script lang="ts">
	import CircleIcon from "@lucide/svelte/icons/circle";
	import DownloadIcon from "@lucide/svelte/icons/download";
	import ImageIcon from "@lucide/svelte/icons/image";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { Button } from "$lib/components/ui/button";

	const borders = [
		{
			name: "Anneau d'Or",
			class: "border-4 border-yellow-500",
			bg: "bg-yellow-900/20",
		},
		{
			name: "Fer Forgé",
			class: "border-[6px] border-slate-700",
			bg: "bg-slate-900/20",
		},
		{ name: "Sang", class: "border-4 border-red-600", bg: "bg-red-900/20" },
		{
			name: "Bois ancien",
			class: "border-4 border-amber-800",
			bg: "bg-amber-900/20",
		},
		{ name: "Simple", class: "border-2 border-white", bg: "bg-transparent" },
	];
</script>

<div class="mx-auto max-w-6xl px-4 py-12">
	<div class="mb-8 text-center">
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20"
		>
			<CircleIcon class="h-8 w-8 text-white" />
		</div>
		<h1
			class="text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
		>
			Créateur de Tokens
		</h1>
		<p class="mt-4 text-lg text-slate-600 dark:text-muted-foreground">
			Générez des tokens parfaits pour vos VTT (Roll20, Foundry, etc.) en
			quelques clics.
		</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-12">
		<!-- Left: Controls -->
		<div class="lg:col-span-5 space-y-6">
			<div
				class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card"
			>
				<h2 class="mb-4 text-lg font-bold text-slate-900 dark:text-white">
					1. Image source
				</h2>
				<div
					class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition-colors hover:border-red-400 hover:bg-red-50/50 dark:border-border dark:bg-muted/50 dark:hover:border-red-900 dark:hover:bg-red-950/20 cursor-pointer"
				>
					<UploadIcon class="mb-3 h-8 w-8 text-slate-400" />
					<p
						class="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300"
					>
						Cliquez ou glissez une image
					</p>
					<p class="text-xs text-slate-500">JPG, PNG ou WebP</p>
				</div>
			</div>

			<div
				class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card"
			>
				<h2 class="mb-4 text-lg font-bold text-slate-900 dark:text-white">
					2. Bordure
				</h2>
				<div class="grid grid-cols-5 gap-3">
					{#each borders as border, i}
						<button
							title={border.name}
							class="aspect-square rounded-full {border.bg} {border.class} flex items-center justify-center transition-transform hover:scale-110 {i ===
							0
								? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-background'
								: ''}"
						>
							{#if i === 0}
								<div class="h-2 w-2 rounded-full bg-red-500"></div>
							{/if}
						</button>
					{/each}
				</div>

				<div class="mt-6">
					<label
						class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
						>Couleur d'arrière-plan</label
					>
					<div class="flex gap-2">
						{#each ["#transparent", "#ffffff", "#000000", "#dc2626", "#1e40af"] as color}
							<button
								class="h-8 w-8 rounded-md border border-slate-200 shadow-sm"
								style="background: {color === '#transparent'
									? 'repeating-conic-gradient(#cbd5e1 0% 25%, white 0% 50%) 50% / 10px 10px'
									: color}"
							></button>
						{/each}
					</div>
				</div>
			</div>

			<Button class="w-full h-12 text-lg bg-red-600 hover:bg-red-700 shadow-md">
				<DownloadIcon class="mr-2 h-5 w-5" />
				Télécharger le Token (PNG)
			</Button>
		</div>

		<!-- Right: Preview -->
		<div class="lg:col-span-7">
			<div
				class="flex h-full min-h-[500px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-8 shadow-inner dark:border-border dark:bg-slate-900/50 relative overflow-hidden"
			>
				<div
					class="absolute inset-0 opacity-10"
					style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px;"
				></div>

				<div class="relative z-10 flex flex-col items-center">
					<h3
						class="mb-8 text-sm font-bold uppercase tracking-wider text-slate-500"
					>
						Aperçu
					</h3>

					<!-- Token Preview -->
					<div
						class="relative h-64 w-64 rounded-full border-4 border-yellow-500 bg-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.3)] dark:bg-slate-800 flex items-center justify-center overflow-hidden"
					>
						<!-- Placeholder image -->
						<ImageIcon class="h-16 w-16 text-slate-400 opacity-50" />
						<span class="absolute text-sm font-medium text-slate-500 mt-24"
							>Image manquante</span
						>
					</div>

					<p class="mt-8 text-sm text-slate-500">
						Utilisez la molette pour zoomer, et glissez pour recentrer l'image.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
