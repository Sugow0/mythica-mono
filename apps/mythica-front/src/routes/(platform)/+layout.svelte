<script lang="ts">
	import CompassIcon from "@lucide/svelte/icons/compass";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";
	import UsersIcon from "@lucide/svelte/icons/users";
	import type { Component } from "svelte";
	import type { Snippet } from "svelte";
	import NavbarUser from "$lib/components/navbar-user.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as NavigationMenu from "$lib/components/ui/navigation-menu";
	import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
	import type { LayoutData } from "./$types";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	type IconComponent = Component<{ class?: string }>;
</script>

{#snippet menuItem(
	href: string,
	Icon: IconComponent,
	title: string,
	desc: string
)}
	<li>
		<NavigationMenu.Link {href} class="flex-row items-center gap-3">
			<span
				class="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
			>
				<Icon class="h-4 w-4" />
			</span>
			<span class="flex flex-col">
				<span class="font-medium">{title}</span>
				<span class="text-muted-foreground text-xs">{desc}</span>
			</span>
		</NavigationMenu.Link>
	</li>
{/snippet}

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
					<!-- Campagnes -->
					<NavigationMenu.Item>
						<NavigationMenu.Trigger>Campagnes</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul class="grid w-[260px] gap-1 p-2">
								{@render menuItem(
									"/campaigns",
									CompassIcon,
									"Explorer",
									"Campagnes publiques"
								)}
								{@render menuItem(
									"/campaigns/me",
									SwordsIcon,
									"Mes campagnes",
									"Vos campagnes personnelles"
								)}
								{@render menuItem(
									"/campaigns/new",
									PlusIcon,
									"Créer une campagne",
									"Démarrer une nouvelle aventure"
								)}
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>

					<!-- Personnages -->
					<NavigationMenu.Item>
						<NavigationMenu.Trigger>Personnages</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul class="grid w-[260px] gap-1 p-2">
								{@render menuItem(
									"/characters",
									UsersIcon,
									"Mes personnages",
									"Vos fiches de personnage"
								)}
								{@render menuItem(
									"/characters/new",
									UserPlusIcon,
									"Créer un nouveau personnage",
									"Nouvelle fiche standalone"
								)}
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>

					<!-- Forum -->
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/forum"
							class={navigationMenuTriggerStyle()}
						>
							Forum
						</NavigationMenu.Link>
					</NavigationMenu.Item>

					<!-- Boutique -->
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/shop"
							class={navigationMenuTriggerStyle()}
						>
							Boutique
						</NavigationMenu.Link>
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
