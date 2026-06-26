<script lang="ts">
	import CompassIcon from "@lucide/svelte/icons/compass";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";
	import UsersIcon from "@lucide/svelte/icons/users";
	import DicesIcon from "@lucide/svelte/icons/dices";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import PenToolIcon from "@lucide/svelte/icons/pen-tool";
	import BoxIcon from "@lucide/svelte/icons/box";
	import CircleIcon from "@lucide/svelte/icons/circle";
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
		{
			kind: "menu",
			label: m.nav_tools,
			items: [
				{
					href: "/tools/dice",
					label: m.nav_tools_dice,
					desc: m.nav_tools_dice_desc,
					icon: DicesIcon,
				},
				{
					href: "/tools/encounter",
					label: m.nav_tools_encounter,
					desc: m.nav_tools_encounter_desc,
					icon: ShieldIcon,
				},
				{
					href: "/tools/names",
					label: m.nav_tools_names,
					desc: m.nav_tools_names_desc,
					icon: PenToolIcon,
				},
				{
					href: "/tools/miniatures",
					label: m.nav_tools_miniatures,
					desc: m.nav_tools_miniatures_desc,
					icon: BoxIcon,
				},
				{
					href: "/tools/tokens",
					label: m.nav_tools_tokens,
					desc: m.nav_tools_tokens_desc,
					icon: CircleIcon,
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
