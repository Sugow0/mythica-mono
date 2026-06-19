<script lang="ts" module>
	import type { Component } from "svelte";

	type IconComponent = Component<{ class?: string }>;

	export type NavSubItem = {
		href: string;
		label: () => string;
		desc?: () => string;
		icon?: IconComponent;
	};

	export type NavItem =
		| { kind: "link"; href: string; label: () => string }
		| { kind: "menu"; label: () => string; items: NavSubItem[] };
</script>

<script lang="ts">
	import type { User } from "$lib/api/types";
	import LanguageSwitcher from "$lib/components/language-switcher.svelte";
	import NavbarUser from "$lib/components/navbar-user.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as NavigationMenu from "$lib/components/ui/navigation-menu";
	import * as m from "$lib/paraglide/messages.js";

	let { user, items }: { user: User | null; items: NavItem[] } = $props();

	const triggerClass =
		"px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-red-600 dark:text-muted-foreground bg-transparent hover:bg-transparent data-[state=open]:bg-transparent";
	const linkClass =
		"px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-red-600 dark:text-muted-foreground";
</script>

{#snippet subItem(sub: NavSubItem)}
	<li>
		<NavigationMenu.Link href={sub.href} class="flex-row items-center gap-3">
			{#if sub.icon}
				{@const Icon = sub.icon}
				<span
					class="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
				>
					<Icon class="h-4 w-4" />
				</span>
			{/if}
			<span class="flex flex-col">
				<span class="font-medium">{sub.label()}</span>
				{#if sub.desc}
					<span class="text-muted-foreground text-xs">{sub.desc()}</span>
				{/if}
			</span>
		</NavigationMenu.Link>
	</li>
{/snippet}

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
				{#each items as item, i (i)}
					<NavigationMenu.Item>
						{#if item.kind === "menu"}
							<NavigationMenu.Trigger class={triggerClass}>
								{item.label()}
							</NavigationMenu.Trigger>
							<NavigationMenu.Content class="p-2">
								<ul class="grid w-[260px] gap-1">
									{#each item.items as sub (sub.href)}
										{@render subItem(sub)}
									{/each}
								</ul>
							</NavigationMenu.Content>
						{:else}
							<NavigationMenu.Link href={item.href} class={linkClass}>
								{item.label()}
							</NavigationMenu.Link>
						{/if}
					</NavigationMenu.Item>
				{/each}
			</NavigationMenu.List>
		</NavigationMenu.Root>

		<!-- Actions -->
		<div class="flex items-center gap-3">
			<LanguageSwitcher />
			{#if user}
				<NavbarUser {user} />
			{:else}
				<Button
					variant="ghost"
					size="sm"
					href="/sign-in"
					class="font-medium text-slate-600 hover:text-red-600"
				>
					{m.nav_sign_in()}
				</Button>
				<Button
					size="sm"
					href="/sign-up"
					class="bg-red-600 text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 hover:scale-105 hover:shadow-lg"
				>
					{m.nav_get_started()}
				</Button>
			{/if}
		</div>
	</div>
</nav>
