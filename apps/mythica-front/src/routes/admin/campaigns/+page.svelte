<script lang="ts">
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

	function formatDate(date: string | number) {
		return new Date(date).toLocaleDateString();
	}

	function prevPage() {
		if (data.page > 1) goto(`/admin/campaigns?page=${data.page - 1}`);
	}

	function nextPage() {
		if (data.page < data.totalPages)
			goto(`/admin/campaigns?page=${data.page + 1}`);
	}
</script>

<div class="p-8">
	<h1 class="mb-6 text-2xl font-bold text-white">
		{m.admin_campaigns_title()}
	</h1>

	<div class="overflow-hidden rounded-xl border border-slate-800">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_name()}</th
					>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_status()}</th
					>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_visibility()}</th
					>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_creator()}</th
					>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_members()}</th
					>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_game_system()}</th
					>
					<th class="px-4 py-3 text-left font-medium text-slate-400"
						>{m.admin_col_date()}</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800 bg-slate-950">
				{#each data.campaigns as campaign (campaign.id)}
					<tr
						class="cursor-pointer transition-colors hover:bg-slate-900"
						onclick={() => goto(`/admin/campaigns/${campaign.id}`)}
					>
						<td class="px-4 py-3 font-medium text-white">{campaign.name}</td>
						<td class="px-4 py-3">
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[
									campaign.status
								] ?? ''}"
							>
								{campaign.status}
							</span>
						</td>
						<td class="px-4 py-3">
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {visibilityColors[
									campaign.visibility
								] ?? ''}"
							>
								{campaign.visibility}
							</span>
						</td>
						<td class="px-4 py-3 text-slate-300">
							{campaign.owner?.pseudo ?? campaign.createdBy?.pseudo ?? "—"}
						</td>
						<td class="px-4 py-3 text-slate-300"
							>{campaign.members?.length ?? 0}</td
						>
						<td class="px-4 py-3 text-slate-300"
							>{campaign.gameSystem?.name ?? "—"}</td
						>
						<td class="px-4 py-3 text-slate-400"
							>{formatDate(campaign.createdAt)}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-8 text-center text-slate-500"
							>Aucune campagne</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="mt-4 flex items-center justify-between">
			<span class="text-sm text-slate-400">
				Page {data.page} / {data.totalPages} ({data.total} total)
			</span>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={prevPage}
					disabled={data.page <= 1}
					class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{m.admin_btn_prev()}
				</button>
				{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as p (p)}
					<button
						type="button"
						onclick={() => goto(`/admin/campaigns?page=${p}`)}
						class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {p ===
						data.page
							? 'bg-red-600 text-white'
							: 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'}"
					>
						{p}
					</button>
				{/each}
				<button
					type="button"
					onclick={nextPage}
					disabled={data.page >= data.totalPages}
					class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{m.admin_btn_next()}
				</button>
			</div>
		</div>
	{/if}
</div>
