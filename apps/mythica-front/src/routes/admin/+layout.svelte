<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
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
	];
</script>

<div class="flex min-h-screen bg-stone-950 text-white">
	<!-- Sidebar -->
	<aside
		class="flex w-60 flex-shrink-0 flex-col border-r border-stone-800 bg-stone-900"
	>
		<!-- Logo -->
		<div class="flex h-16 items-center gap-2.5 border-b border-stone-800 px-5">
			<svg class="h-7 w-7" viewBox="0 0 40 40" fill="none" aria-hidden="true">
				<rect width="40" height="40" rx="10" class="fill-teal-600" />
				<path
					d="M12 28V12h4l4 10 4-10h4v16h-3.5v-10l-3.5 8h-2l-3.5-8v10H12z"
					class="fill-white"
				/>
			</svg>
			<span class="text-lg font-bold tracking-tight">Mythica</span>
			<span
				class="ml-auto rounded bg-teal-600/20 px-1.5 py-0.5 text-xs font-semibold text-teal-400"
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
						? 'bg-teal-600/20 text-teal-400'
						: 'text-stone-400 hover:bg-stone-800 hover:text-white'}"
				>
					<item.icon class="h-4 w-4 flex-shrink-0" />
					{item.label()}
				</a>
			{/each}
		</nav>

		<!-- Back to platform -->
		<div class="border-t border-stone-800 p-3">
			<button
				type="button"
				onclick={() => goto("/")}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
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
