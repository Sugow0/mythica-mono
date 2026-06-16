<script lang="ts">
	import type { Snippet } from "svelte";
	import NavbarUser from "$lib/components/navbar-user.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as NavigationMenu from "$lib/components/ui/navigation-menu";
	import type { LayoutData } from "./$types";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="min-h-screen bg-slate-50 text-foreground dark:bg-background">
	<!-- Navbar -->
	<nav
		class="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/60 bg-slate-50/90 backdrop-blur-xl dark:border-border/40 dark:bg-background/80"
	>
		<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
			<!-- Logo -->
			<a
				href="/"
				class="flex items-center gap-2.5 transition-transform hover:scale-105"
			>
				<svg class="h-8 w-8" viewBox="0 0 40 40" fill="none" aria-hidden="true">
					<rect width="40" height="40" rx="10" class="fill-red-600" />
					<path
						d="M12 28V12h4l4 10 4-10h4v16h-3.5v-10l-3.5 8h-2l-3.5-8v10H12z"
						class="fill-white"
					/>
				</svg>
				<span
					class="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
					>Mythica</span
				>
			</a>

			<!-- Navigation -->
			<NavigationMenu.Root class="hidden md:flex">
				<NavigationMenu.List class="flex gap-1">
					<!-- Campagnes dropdown -->
					<NavigationMenu.Item>
						<NavigationMenu.Trigger>Campagnes</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul class="grid w-[240px] gap-1 p-2">
								<li>
									<NavigationMenu.Link href="/campaigns">
										<div class="font-medium">Explorer</div>
										<div class="text-muted-foreground">Campagnes publiques</div>
									</NavigationMenu.Link>
								</li>
								<li>
									<NavigationMenu.Link href="/campaigns/me">
										<div class="font-medium">Mes campagnes</div>
										<div class="text-muted-foreground">
											Vos campagnes personnelles
										</div>
									</NavigationMenu.Link>
								</li>
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>

					<!-- Fiches de personnage -->
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/characters">Fiches</NavigationMenu.Link>
					</NavigationMenu.Item>

					<!-- Forum -->
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/forum">Forum</NavigationMenu.Link>
					</NavigationMenu.Item>

					<!-- Boutique -->
					<NavigationMenu.Item>
						<NavigationMenu.Link href="/shop">Boutique</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<!-- Actions -->
			<div class="flex items-center gap-3">
				{#if data.user}
					<NavbarUser user={data.user} />
				{:else}
					<Button
						variant="ghost"
						size="sm"
						href="/sign-in"
						class="font-medium text-slate-600 hover:text-red-600"
					>
						Connexion
					</Button>
					<Button
						size="sm"
						href="/sign-up"
						class="bg-red-600 text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 hover:scale-105 hover:shadow-lg"
					>
						Commencer
					</Button>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Page content with top padding for fixed navbar -->
	<main class="pt-16">
		{@render children()}
	</main>
</div>
