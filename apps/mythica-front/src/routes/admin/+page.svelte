<script lang="ts">
	import ArchiveIcon from "@lucide/svelte/icons/archive";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import LockIcon from "@lucide/svelte/icons/lock";
	import ScrollIcon from "@lucide/svelte/icons/scroll";
	import UsersIcon from "@lucide/svelte/icons/users";
	import ZapIcon from "@lucide/svelte/icons/zap";
	import * as m from "$lib/paraglide/messages.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{
			label: m.admin_dashboard_total_users(),
			value: data.totalUsers,
			icon: UsersIcon,
			color: "teal",
		},
		{
			label: m.admin_dashboard_total_campaigns(),
			value: data.totalCampaigns,
			icon: ScrollIcon,
			color: "blue",
		},
		{
			label: m.admin_dashboard_active_campaigns(),
			value: data.activeCampaigns,
			icon: ZapIcon,
			color: "green",
		},
		{
			label: m.admin_dashboard_draft_campaigns(),
			value: data.draftCampaigns,
			icon: FileTextIcon,
			color: "yellow",
		},
		{
			label: m.admin_dashboard_archived_campaigns(),
			value: data.archivedCampaigns,
			icon: ArchiveIcon,
			color: "stone",
		},
		{
			label: m.admin_dashboard_public_campaigns(),
			value: data.publicCampaigns,
			icon: GlobeIcon,
			color: "indigo",
		},
		{
			label: m.admin_dashboard_private_campaigns(),
			value: data.privateCampaigns,
			icon: LockIcon,
			color: "rose",
		},
	]);

	const colorMap: Record<string, string> = {
		teal: "bg-teal-500/10 text-teal-400",
		blue: "bg-blue-500/10 text-blue-400",
		green: "bg-green-500/10 text-green-400",
		yellow: "bg-yellow-500/10 text-yellow-400",
		stone: "bg-stone-500/10 text-stone-400",
		indigo: "bg-indigo-500/10 text-indigo-400",
		rose: "bg-rose-500/10 text-rose-400",
	};
</script>

<div class="p-8">
	<h1 class="mb-8 text-2xl font-bold text-white">
		{m.admin_dashboard_title()}
	</h1>

	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
	>
		{#each stats as stat (stat.label)}
			<div class="rounded-xl border border-stone-800 bg-stone-900 p-5">
				<div class="mb-4 flex items-center justify-between">
					<span class="text-sm font-medium text-stone-400">{stat.label}</span>
					<div class="rounded-lg p-2 {colorMap[stat.color]}">
						<stat.icon class="h-4 w-4" />
					</div>
				</div>
				<p class="text-3xl font-bold text-white">{stat.value}</p>
			</div>
		{/each}
	</div>
</div>
