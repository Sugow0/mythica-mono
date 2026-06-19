<script lang="ts">
	import CompassIcon from "@lucide/svelte/icons/compass";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";
	import UsersIcon from "@lucide/svelte/icons/users";
	import type { Snippet } from "svelte";
	import Navbar, { type NavItem } from "$lib/components/navbar.svelte";
	import * as m from "$lib/paraglide/messages.js";
	import type { LayoutData } from "./$types";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const items: NavItem[] = [
		{
			kind: "menu",
			label: m.nav_campaigns,
			items: [
				{
					href: "/campaigns",
					label: m.nav_explore,
					desc: m.nav_explore_desc,
					icon: CompassIcon,
				},
				{
					href: "/campaigns/me",
					label: m.nav_my_campaigns,
					desc: m.nav_my_campaigns_desc,
					icon: SwordsIcon,
				},
				{
					href: "/campaigns/new",
					label: m.nav_create_campaign,
					desc: m.nav_create_campaign_desc,
					icon: PlusIcon,
				},
			],
		},
		{
			kind: "menu",
			label: m.nav_characters_menu,
			items: [
				{
					href: "/characters",
					label: m.nav_my_characters,
					desc: m.nav_my_characters_desc,
					icon: UsersIcon,
				},
				{
					href: "/characters/new",
					label: m.nav_create_character,
					desc: m.nav_create_character_desc,
					icon: UserPlusIcon,
				},
			],
		},
		{ kind: "link", href: "/forum", label: m.nav_forum },
		{ kind: "link", href: "/shop", label: m.nav_shop },
	];
</script>

<div class="min-h-screen bg-slate-50 text-foreground dark:bg-background">
	<Navbar user={data.user} {items} />

	<!-- Page content with top padding for fixed navbar -->
	<main class="pt-16">
		{@render children()}
	</main>
</div>
