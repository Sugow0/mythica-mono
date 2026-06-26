<script lang="ts">
	import ArrowBigDownIcon from "@lucide/svelte/icons/arrow-big-down";
	import ArrowBigUpIcon from "@lucide/svelte/icons/arrow-big-up";
	import FlameIcon from "@lucide/svelte/icons/flame";
	import MessageSquareIcon from "@lucide/svelte/icons/message-square";
	import SearchIcon from "@lucide/svelte/icons/search";
	import ShareIcon from "@lucide/svelte/icons/share";
	import StarIcon from "@lucide/svelte/icons/star";
	import UsersIcon from "@lucide/svelte/icons/users";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Button } from "$lib/components/ui/button";

	// Mock data for the forum feed
	const posts = [
		{
			id: 1,
			title: "Mon build ultime de Paladin Serment de Vengeance (Niveau 10)",
			author: "ThorinEcuDeChene",
			time: "Il y a 2 heures",
			community: "r/Builds",
			content:
				"J'ai passé beaucoup de temps à optimiser ce build. L'idée est de combiner le don Maître des Armes d'Hast avec Sentinelle pour contrôler le champ de bataille. En utilisant l'Aura de Protection, on devient un véritable tank increvable tout en faisant des dégâts massifs...",
			upvotes: 245,
			comments: 42,
			tags: ["D&D 5e", "Optimisation", "Paladin"],
			image: null,
		},
		{
			id: 2,
			title: "Carte de taverne animée (Grille 20x20)",
			author: "CartographeFou",
			time: "Il y a 4 heures",
			community: "r/Maps",
			content:
				"Salut tout le monde ! Voici une carte de la taverne du Poney Fringant que j'ai réalisée pour ma dernière session. Libre de droits pour vos campagnes ! Elle inclut les étages et la cave. Parfait pour une auberge de départ.",
			upvotes: 892,
			comments: 156,
			tags: ["Battlemap", "Auberge", "Gratuit"],
			image:
				"https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=800&auto=format&fit=crop",
		},
		{
			id: 3,
			title: "Comment gérez-vous la mort d'un personnage de joueur ?",
			author: "MJDébutant",
			time: "Il y a 5 heures",
			community: "r/Discussions",
			content:
				"Hier soir, j'ai tué mon premier PJ par accident avec un jet critique d'un gobelin (oui, je sais...). La joueuse était très attachée à son perso. Comment gérez-vous cela à votre table ? Avez-vous des rituels ou des mécaniques de résurrection spécifiques ?",
			upvotes: 120,
			comments: 89,
			tags: ["Conseils MJ", "Discussion"],
			image: null,
		},
	];

	const communities = [
		{ name: "r/MythicaGeneral", members: "15k" },
		{ name: "r/Discussions", members: "42k" },
		{ name: "r/Builds", members: "28k" },
		{ name: "r/Maps", members: "35k" },
		{ name: "r/RechercheJoueurs", members: "12k" },
	];
</script>

<div class="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
	<!-- Header Section -->
	<div
		class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<h1
				class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
			>
				Le Grand Forum
			</h1>
			<p class="mt-1 text-slate-500 dark:text-muted-foreground">
				Partagez vos builds, vos cartes, et discutez avec des milliers de
				rôlistes.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="relative w-full md:w-64">
				<SearchIcon
					class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
				/>
				<input
					type="text"
					placeholder="Rechercher sur le forum..."
					class="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-border dark:bg-background"
				/>
			</div>
			<Button
				class="bg-red-600 text-white shadow-md transition-transform hover:scale-105 hover:bg-red-700"
			>
				Créer un post
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<!-- Left Sidebar (Navigation) -->
		<aside class="hidden lg:col-span-3 lg:block">
			<nav class="sticky top-24 space-y-8">
				<div>
					<h3
						class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
					>
						Flux
					</h3>
					<ul class="space-y-1">
						<li>
							<a
								href="#"
								class="flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400"
							>
								<FlameIcon class="h-4 w-4" />
								Populaire
							</a>
						</li>
						<li>
							<a
								href="#"
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-slate-800 dark:hover:text-white"
							>
								<StarIcon class="h-4 w-4" />
								Nouveau
							</a>
						</li>
						<li>
							<a
								href="#"
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-slate-800 dark:hover:text-white"
							>
								<UsersIcon class="h-4 w-4" />
								Mes abonnements
							</a>
						</li>
					</ul>
				</div>

				<div>
					<h3
						class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
					>
						Communautés tendances
					</h3>
					<ul class="space-y-1">
						{#each communities as community}
							<li>
								<a
									href="#"
									class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									<span class="font-medium text-slate-700 dark:text-slate-300"
										>{community.name}</span
									>
									<span class="text-xs text-slate-400">{community.members}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</nav>
		</aside>

		<!-- Main Feed -->
		<main class="lg:col-span-6">
			<!-- Create post prompt -->
			<div
				class="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card"
			>
				<Avatar.Root class="h-10 w-10">
					<Avatar.Fallback class="bg-red-100 text-red-700 font-bold"
						>M</Avatar.Fallback
					>
				</Avatar.Root>
				<input
					type="text"
					placeholder="Partagez une idée, une carte, ou posez une question..."
					class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition-colors focus:border-red-500 focus:bg-white dark:border-border dark:bg-background dark:focus:bg-card"
				/>
			</div>

			<!-- Posts -->
			<div class="space-y-4">
				{#each posts as post (post.id)}
					<article
						class="group flex cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-red-300 hover:shadow-md dark:border-border dark:bg-card"
					>
						<!-- Vote column -->
						<div
							class="flex w-12 flex-col items-center bg-slate-50 py-3 dark:bg-muted/50"
						>
							<button
								class="text-slate-400 transition-colors hover:text-red-500"
							>
								<ArrowBigUpIcon class="h-6 w-6" />
							</button>
							<span
								class="my-1 text-sm font-bold text-slate-700 dark:text-slate-300"
							>
								{post.upvotes}
							</span>
							<button
								class="text-slate-400 transition-colors hover:text-blue-500"
							>
								<ArrowBigDownIcon class="h-6 w-6" />
							</button>
						</div>

						<!-- Post content -->
						<div class="flex-1 p-4">
							<div class="mb-2 flex items-center gap-2 text-xs text-slate-500">
								<span class="font-bold text-slate-900 dark:text-white"
									>{post.community}</span
								>
								<span>•</span>
								<span>Posté par u/{post.author}</span>
								<span>•</span>
								<span>{post.time}</span>
							</div>

							<h2
								class="mb-2 text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors"
							>
								{post.title}
							</h2>

							<!-- Tags -->
							<div class="mb-3 flex flex-wrap gap-2">
								{#each post.tags as tag}
									<span
										class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
									>
										{tag}
									</span>
								{/each}
							</div>

							<p
								class="mb-4 text-sm text-slate-600 dark:text-muted-foreground line-clamp-3"
							>
								{post.content}
							</p>

							{#if post.image}
								<div class="mb-4 overflow-hidden rounded-lg">
									<img
										src={post.image}
										alt="Post illustration"
										class="max-h-96 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
									/>
								</div>
							{/if}

							<!-- Actions -->
							<div
								class="flex items-center gap-4 text-sm font-medium text-slate-500"
							>
								<button
									class="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600"
								>
									<MessageSquareIcon class="h-4 w-4" />
									{post.comments} Commentaires
								</button>
								<button
									class="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600"
								>
									<ShareIcon class="h-4 w-4" />
									Partager
								</button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</main>

		<!-- Right Sidebar (Stats / Call to actions) -->
		<aside class="hidden lg:col-span-3 lg:block">
			<div class="sticky top-24 space-y-6">
				<!-- Mythica Premium Banner -->
				<div
					class="overflow-hidden rounded-xl border border-red-200 bg-gradient-to-br from-white to-red-50 p-5 shadow-sm dark:border-red-900/30 dark:from-card dark:to-red-950/20 relative group"
				>
					<div
						class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-500/10 blur-2xl group-hover:bg-red-500/20 transition-all duration-500"
					></div>
					<div class="mb-3 flex items-center gap-2 relative z-10">
						<FlameIcon class="h-5 w-5 text-red-500 animate-pulse" />
						<h3 class="font-bold text-slate-900 dark:text-white">
							Mythica Premium
						</h3>
					</div>
					<p
						class="mb-4 text-sm text-slate-600 dark:text-muted-foreground relative z-10"
					>
						Soutenez la plateforme, débloquez des tokens exclusifs et retirez
						les publicités pour soutenir l'hébergement.
					</p>
					<Button
						class="w-full bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg transition-all relative z-10"
					>
						En savoir plus
					</Button>
				</div>

				<!-- Top Contributors -->
				<div
					class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
				>
					<h3 class="mb-4 font-bold text-slate-900 dark:text-white">
						Top Contributeurs
					</h3>
					<ul class="space-y-4">
						{#each Array(5) as _, i}
							<li class="flex items-center justify-between group">
								<div class="flex items-center gap-3">
									<Avatar.Root
										class="h-8 w-8 transition-transform group-hover:scale-110"
									>
										<Avatar.Fallback
											class="bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300"
										>
											{String.fromCharCode(65 + i)}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex flex-col">
										<span
											class="text-sm font-medium text-slate-900 dark:text-white group-hover:text-red-500 transition-colors"
										>
											Utilisateur{i + 1}
										</span>
										<span class="text-xs text-slate-500"
											>{(5 - i) * 12}k karma</span
										>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
								>
									Suivre
								</Button>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</aside>
	</div>
</div>
