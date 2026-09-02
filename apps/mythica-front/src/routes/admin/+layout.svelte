<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import DownloadIcon from "@lucide/svelte/icons/download";
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import ScrollIcon from "@lucide/svelte/icons/scroll";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import type { Snippet } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import * as m from "$lib/paraglide/messages.js";

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{
			href: "/admin",
			label: () => m.admin_nav_dashboard(),
			icon: LayoutDashboardIcon,
			exact: true,
		},
		{
			href: "/admin/campaigns",
			label: () => m.admin_nav_campaigns(),
			icon: ScrollIcon,
			exact: false,
		},
		{
			href: "/admin/game-systems",
			label: () => m.admin_nav_game_systems(),
			icon: SwordsIcon,
			exact: false,
		},
		{
			href: "/admin/content-imports",
			label: () => "Import contenu",
			icon: DownloadIcon,
			exact: false,
		},
	];
</script>

<div class="flex min-h-screen bg-background text-foreground">
	<!-- Sidebar -->
	<aside
		class="flex w-60 flex-shrink-0 flex-col border-r border-border bg-sidebar"
	>
		<!-- Logo -->
		<div class="flex h-16 items-center gap-2.5 border-b border-border px-5">
			<svg class="h-7 w-7" viewBox="0 0 40 40" fill="none" aria-hidden="true">
				<rect width="40" height="40" rx="10" class="fill-primary" />
				<path
					d="M12 28V12h4l4 10 4-10h4v16h-3.5v-10l-3.5 8h-2l-3.5-8v10H12z"
					class="fill-primary-foreground"
				/>
			</svg>
			<span class="text-lg font-bold tracking-tight text-sidebar-foreground"
				>Mythica</span
			>
			<span
				class="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary"
				>Admin</span
			>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 space-y-1 p-3">
			{#each navItems as item (item.href)}
				{@const isActive = item.exact
					? page.url.pathname === item.href
					: page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {isActive
						? 'bg-primary/10 text-primary'
						: 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
				>
					<item.icon class="h-4 w-4 flex-shrink-0" />
					{item.label()}
				</a>
			{/each}
		</nav>

		<!-- Theme toggle & Back -->
		<div class="border-t border-border p-3 flex flex-col gap-2">
			<button
				type="button"
				onclick={() => {
					const isDark = document.documentElement.classList.contains("dark");
					import("mode-watcher").then(({ setMode }) => {
						setMode(isDark ? "light" : "dark");
					});
				}}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			>
				<span class="flex-1 text-left">Changer de thème</span>
				<div class="relative h-4 w-4 flex-shrink-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="absolute hidden dark:block"
						><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg
					>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="absolute block dark:hidden"
						><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path
							d="M12 20v2"
						/><path d="m4.93 4.93 1.41 1.41" /><path
							d="m17.66 17.66 1.41 1.41"
						/><path d="M2 12h2" /><path d="M20 12h2" /><path
							d="m6.34 17.66-1.41 1.41"
						/><path d="m19.07 4.93-1.41 1.41" /></svg
					>
				</div>
			</button>
			<button
				type="button"
				onclick={() => goto("/")}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			>
				<ArrowLeftIcon class="h-4 w-4 flex-shrink-0" />
				{m.admin_back_to_platform()}
			</button>
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
