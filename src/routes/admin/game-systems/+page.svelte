<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import TagIcon from "@lucide/svelte/icons/tag";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import XIcon from "@lucide/svelte/icons/x";
	import { enhance } from "$app/forms";
	import * as m from "$lib/paraglide/messages.js";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateForm = $state(false);
	let expandedId = $state<string | null>(null);

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function formatDate(date: string | number) {
		return new Date(date).toLocaleDateString();
	}

	// Auto-expand the game system that just received an action
	$effect(() => {
		if (form?.action === "addVersion" || form?.action === "deleteVersion") {
			expandedId =
				(form as { gameSystemId?: string }).gameSystemId ?? expandedId;
		}
	});
</script>

<div class="p-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-white">
			{m.admin_game_systems_title()}
		</h1>
		<button
			type="button"
			onclick={() => (showCreateForm = !showCreateForm)}
			class="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
		>
			<PlusIcon class="h-4 w-4" />
			{m.admin_btn_new_system()}
		</button>
	</div>

	<!-- Formulaire de création -->
	{#if showCreateForm}
		<div class="mb-6 rounded-xl border border-stone-700 bg-stone-900 p-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-semibold text-white">{m.admin_btn_new_system()}</h2>
				<button
					type="button"
					onclick={() => (showCreateForm = false)}
					class="text-stone-500 hover:text-white"
					aria-label="Fermer"
				>
					<XIcon class="h-4 w-4" />
				</button>
			</div>

			{#if form?.action === "create" && form?.error}
				<p
					class="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400"
				>
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
							for="name"
							class="mb-1.5 block text-sm font-medium text-stone-400"
						>
							{m.admin_form_name_label()} *
						</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							class="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
						/>
					</div>
					<div>
						<label
							for="description"
							class="mb-1.5 block text-sm font-medium text-stone-400"
						>
							{m.admin_form_description_label()}
						</label>
						<textarea
							id="description"
							name="description"
							rows="3"
							class="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
						></textarea>
					</div>
					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={() => (showCreateForm = false)}
							class="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
						>
							{m.admin_btn_cancel()}
						</button>
						<button
							type="submit"
							class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
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
			{@const isExpanded = expandedId === gs.id}
			{@const hasVersionError =
				form?.action === "addVersion" &&
				(form as { gameSystemId?: string })?.gameSystemId === gs.id &&
				form?.error}

			<div
				class="overflow-hidden rounded-xl border border-stone-800 bg-stone-950"
			>
				<!-- En-tête de la ligne -->
				<div class="flex items-center gap-3 px-4 py-3">
					<button
						type="button"
						onclick={() => toggleExpand(gs.id)}
						class="flex flex-1 items-center gap-3 text-left"
					>
						{#if isExpanded}
							<ChevronDownIcon class="h-4 w-4 flex-shrink-0 text-teal-400" />
						{:else}
							<ChevronRightIcon class="h-4 w-4 flex-shrink-0 text-stone-500" />
						{/if}
						<span class="font-medium text-white">{gs.name}</span>
						{#if gs.description}
							<span
								class="hidden max-w-sm truncate text-sm text-stone-500 md:block"
								>{gs.description}</span
							>
						{/if}
						<div class="ml-auto flex items-center gap-2">
							<span
								class="flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-0.5 text-xs text-stone-400"
							>
								<TagIcon class="h-3 w-3" />
								{gs.gameSystemVersions?.length ?? 0} version{(gs
									.gameSystemVersions?.length ?? 0) !== 1
									? "s"
									: ""}
							</span>
							<span class="text-xs text-stone-600"
								>{formatDate(gs.createdAt)}</span
							>
						</div>
					</button>

					<!-- Supprimer le système -->
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={gs.id} />
						<button
							type="submit"
							class="rounded-lg p-1.5 text-stone-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
							title={m.admin_btn_delete()}
							onclick={(e) => {
								if (!confirm(`Supprimer "${gs.name}" et toutes ses versions ?`))
									e.preventDefault();
							}}
						>
							<TrashIcon class="h-4 w-4" />
						</button>
					</form>
				</div>

				<!-- Panneau versions (expansible) -->
				{#if isExpanded}
					<div class="border-t border-stone-800 bg-stone-900 px-5 py-4">
						<p
							class="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500"
						>
							{m.admin_col_versions()}
						</p>

						{#if hasVersionError}
							<p
								class="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400"
							>
								{form?.error}
							</p>
						{/if}

						<!-- Versions existantes -->
						{#if gs.gameSystemVersions?.length}
							<div class="mb-4 flex flex-wrap gap-2">
								{#each gs.gameSystemVersions as v (v.version)}
									<div
										class="flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-800 pl-3 pr-1.5 py-1"
									>
										<span class="text-sm font-medium text-stone-200"
											>{v.version}</span
										>
										<form method="POST" action="?/deleteVersion" use:enhance>
											<input type="hidden" name="gameSystemId" value={gs.id} />
											<input type="hidden" name="versionId" value={v.id} />
											<button
												type="submit"
												class="rounded-full p-0.5 text-stone-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
												title="Supprimer la version"
											>
												<XIcon class="h-3 w-3" />
											</button>
										</form>
									</div>
								{/each}
							</div>
						{:else}
							<p class="mb-4 text-sm text-stone-600">
								Aucune version pour le moment.
							</p>
						{/if}

						<!-- Ajouter une version -->
						<form
							method="POST"
							action="?/addVersion"
							use:enhance
							class="flex items-center gap-2"
						>
							<input type="hidden" name="gameSystemId" value={gs.id} />
							<input
								name="version"
								type="text"
								placeholder="ex: 5e, v2, 2024..."
								required
								class="w-48 rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
							/>
							<button
								type="submit"
								class="flex items-center gap-1.5 rounded-lg bg-teal-600/20 px-3 py-1.5 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-600/30"
							>
								<PlusIcon class="h-3.5 w-3.5" />
								Ajouter
							</button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<div
				class="rounded-xl border border-stone-800 py-12 text-center text-stone-500"
			>
				Aucun système de jeu.
			</div>
		{/each}
	</div>
</div>
