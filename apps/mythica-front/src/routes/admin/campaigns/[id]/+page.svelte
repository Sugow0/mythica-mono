<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import { goto } from "$app/navigation";
	import * as m from "$lib/paraglide/messages.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const statusColors: Record<string, string> = {
		ACTIVE: "bg-green-500/20 text-green-400",
		DRAFT: "bg-yellow-500/20 text-yellow-400",
		ARCHIVED: "bg-slate-500/20 text-slate-400",
	};

	const visibilityColors: Record<string, string> = {
		PUBLIC: "bg-blue-500/20 text-blue-400",
		PRIVATE: "bg-red-500/20 text-red-400",
	};
</script>

<div class="p-8">
	<button
		type="button"
		onclick={() => goto("/admin/campaigns")}
		class="mb-6 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
	>
		<ArrowLeftIcon class="h-4 w-4" />
		{m.admin_campaigns_title()}
	</button>

	{#if !data.campaign}
		<p class="text-slate-400">Campagne introuvable.</p>
	{:else}
		{@const c = data.campaign}
		<h1 class="mb-6 text-2xl font-bold text-white">{c.name}</h1>

		<!-- General info -->
		<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
				<p class="mb-1 text-xs font-medium text-slate-500">
					{m.admin_col_status()}
				</p>
				<span
					class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[
						c.status
					] ?? ''}"
				>
					{c.status ?? "—"}
				</span>
			</div>
			<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
				<p class="mb-1 text-xs font-medium text-slate-500">
					{m.admin_col_visibility()}
				</p>
				<span
					class="rounded-full px-2 py-0.5 text-xs font-medium {visibilityColors[
						c.visibility
					] ?? ''}"
				>
					{c.visibility ?? "—"}
				</span>
			</div>
			<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
				<p class="mb-1 text-xs font-medium text-slate-500">
					{m.admin_col_creator()}
				</p>
				<p class="text-sm font-medium text-white">
					{c.owner?.pseudo ?? c.createdBy?.pseudo ?? "—"}
				</p>
			</div>
			<div
				class="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:col-span-2 lg:col-span-3"
			>
				<p class="mb-1 text-xs font-medium text-slate-500">Description</p>
				<p class="text-sm text-slate-300">{c.description || "—"}</p>
			</div>
		</div>

		<!-- Game system -->
		{#if c.gameSystem}
			<div class="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
				<p class="mb-2 text-xs font-medium text-slate-500">
					{m.admin_col_game_system()}
				</p>
				<p class="text-sm font-medium text-white">{c.gameSystem.name}</p>
				{#if c.gameSystem.versions?.length}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each c.gameSystem.versions as v (v.version ?? v)}
							<span
								class="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
								>{v.version ?? v}</span
							>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Members -->
		<div class="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="mb-3 text-xs font-medium text-slate-500">
				{m.admin_campaign_members()}
			</p>
			{#if c.members?.length}
				<div class="space-y-2">
					{#each c.members as member (member.id)}
						{@const u = member.user ?? member}
						<div class="flex items-center gap-3">
							{#if u.avatar}
								<img
									src={u.avatar}
									alt={u.pseudo}
									class="h-7 w-7 rounded-full object-cover"
								/>
							{:else}
								<div
									class="flex h-7 w-7 items-center justify-center rounded-full bg-red-600/20 text-xs font-bold text-red-400"
								>
									{u.pseudo?.slice(0, 2).toUpperCase() ?? "?"}
								</div>
							{/if}
							<span class="text-sm text-slate-300">{u.pseudo}</span>
							{#if member.role}
								<span
									class="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
									>{member.role}</span
								>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-slate-500">Aucun membre.</p>
			{/if}
		</div>

		<!-- Character sheets placeholder -->
		<div
			class="rounded-xl border border-dashed border-slate-700 p-6 text-center"
		>
			<p class="text-sm text-slate-500">{m.admin_campaign_characters()}</p>
		</div>
	{/if}
</div>
