<script lang="ts">
	import PlusIcon from "@lucide/svelte/icons/plus";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import XIcon from "@lucide/svelte/icons/x";
	import { enhance } from "$app/forms";
	import * as m from "$lib/paraglide/messages.js";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateForm = $state(false);

	function formatDate(date: string | number) {
		return new Date(date).toLocaleDateString();
	}
</script>

<div class="p-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-white">
			{m.admin_game_systems_title()}
		</h1>
		<button
			type="button"
			onclick={() => (showCreateForm = !showCreateForm)}
			class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
		>
			<PlusIcon class="h-4 w-4" />
			{m.admin_btn_new_system()}
		</button>
	</div>

	<!-- Formulaire de création -->
	{#if showCreateForm}
		<div class="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-semibold text-white">{m.admin_btn_new_system()}</h2>
				<button
					type="button"
					onclick={() => (showCreateForm = false)}
					class="text-slate-500 hover:text-white"
					aria-label="Fermer"
				>
					<XIcon class="h-4 w-4" />
				</button>
			</div>

			{#if form?.action === "create" && form?.error}
				<p class="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
					{form.error}
				</p>
			{/if}

			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return ({ update }) => {
						update();
						showCreateForm = false;
					};
				}}
			>
				<div class="space-y-4">
					<div>
						<label
							for="nom"
							class="mb-1.5 block text-sm font-medium text-slate-400"
						>
							{m.admin_form_name_label()} *
						</label>
						<input
							id="nom"
							name="nom"
							type="text"
							required
							class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label
								for="version"
								class="mb-1.5 block text-sm font-medium text-slate-400"
							>
								Version *
							</label>
							<input
								id="version"
								name="version"
								type="text"
								required
								placeholder="ex: 5e, 7e, 2024..."
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
							/>
						</div>
						<div>
							<label
								for="slug"
								class="mb-1.5 block text-sm font-medium text-slate-400"
							>
								Slug *
							</label>
							<input
								id="slug"
								name="slug"
								type="text"
								required
								placeholder="ex: dnd-5e"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
							/>
						</div>
					</div>
					<div>
						<label
							for="description"
							class="mb-1.5 block text-sm font-medium text-slate-400"
						>
							{m.admin_form_description_label()}
						</label>
						<textarea
							id="description"
							name="description"
							rows="3"
							class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
						></textarea>
					</div>
					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={() => (showCreateForm = false)}
							class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
						>
							{m.admin_btn_cancel()}
						</button>
						<button
							type="submit"
							class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
						>
							{m.admin_btn_create()}
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}

	<!-- Liste des systèmes -->
	<div class="space-y-2">
		{#each data.gameSystems as gs (gs.id)}
			<div
				class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
			>
				<span class="font-medium text-white">{gs.nom}</span>
				<span
					class="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400"
				>
					{gs.version}
				</span>
				{#if gs.description}
					<span class="hidden max-w-sm truncate text-sm text-slate-500 md:block"
						>{gs.description}</span
					>
				{/if}
				<div class="ml-auto flex items-center gap-3">
					<span class="text-xs text-slate-600">{formatDate(gs.createdAt)}</span>

					<!-- Supprimer le système -->
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={gs.id} />
						<button
							type="submit"
							class="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
							title={m.admin_btn_delete()}
							onclick={(e) => {
								if (!confirm(`Supprimer "${gs.nom}" ?`)) e.preventDefault();
							}}
						>
							<TrashIcon class="h-4 w-4" />
						</button>
					</form>
				</div>
			</div>
		{:else}
			<div
				class="rounded-xl border border-slate-800 py-12 text-center text-slate-500"
			>
				Aucun système de jeu.
			</div>
		{/each}
	</div>
</div>
