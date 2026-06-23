<script lang="ts">
	import PlusIcon from "@lucide/svelte/icons/plus";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import XIcon from "@lucide/svelte/icons/x";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import { enhance } from "$app/forms";
	import * as m from "$lib/paraglide/messages.js";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type GS = {
		id: string;
		nom: string;
		version: string;
		slug: string;
		description: string | null;
		isOfficial: boolean;
		parentSystemId: string | null;
		createdAt: string;
	};
	type TreeNode = GS & { children: GS[] };

	let showCreateForm = $state(false);
	let editingId = $state<string | null>(null);

	function formatDate(date: string | number) {
		return new Date(date).toLocaleDateString("fr-FR");
	}

	const systems = $derived(data.gameSystems as GS[]);
	const tree = $derived(buildTree(systems));

	function buildTree(list: GS[]): TreeNode[] {
		const roots = list.filter((s) => !s.parentSystemId);
		return roots.map((root) => ({
			...root,
			children: list.filter((s) => s.parentSystemId === root.id),
		}));
	}

	function otherSystems(excludeId: string): GS[] {
		return systems.filter((s) => s.id !== excludeId);
	}
</script>

<div class="p-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-white">
			{m.admin_game_systems_title()}
		</h1>
		<button
			type="button"
			onclick={() => {
				showCreateForm = !showCreateForm;
				editingId = null;
			}}
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
								{m.admin_form_version_label()} *
							</label>
							<input
								id="version"
								name="version"
								type="text"
								required
								placeholder="5e, 7e, 2024…"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
							/>
						</div>
						<div>
							<label
								for="slug"
								class="mb-1.5 block text-sm font-medium text-slate-400"
							>
								{m.admin_form_slug_label()} *
							</label>
							<input
								id="slug"
								name="slug"
								type="text"
								required
								placeholder="dnd-5e"
								class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
							/>
						</div>
					</div>
					<div>
						<label
							for="parentSystemId"
							class="mb-1.5 block text-sm font-medium text-slate-400"
						>
							{m.admin_form_parent_label()}
						</label>
						<select
							id="parentSystemId"
							name="parentSystemId"
							class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
						>
							<option value="">{m.admin_form_no_parent()}</option>
							{#each data.gameSystems as gs (gs.id)}
								<option value={gs.id}>{gs.nom} (v{gs.version})</option>
							{/each}
						</select>
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
					<label class="flex cursor-pointer items-center gap-2.5">
						<input
							type="checkbox"
							name="isOfficial"
							class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-red-500 accent-red-500"
						/>
						<span class="text-sm text-slate-300"
							>{m.admin_form_official_label()}</span
						>
					</label>
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

	<!-- Liste arborescente -->
	<div class="space-y-1">
		{#each tree as root (root.id)}
			<!-- Racine -->
			<div
				class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
			>
				{#if root.isOfficial}
					<SparklesIcon class="h-3.5 w-3.5 shrink-0 text-red-400" />
				{/if}
				<span class="font-medium text-white">{root.nom}</span>
				<span
					class="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400"
				>
					v{root.version}
				</span>
				{#if root.children.length > 0}
					<span
						class="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500"
					>
						{root.children.length} version{root.children.length > 1 ? "s" : ""}
					</span>
				{/if}
				{#if root.description}
					<span
						class="hidden max-w-xs truncate text-sm text-slate-500 md:block"
					>
						{root.description}
					</span>
				{/if}
				<div class="ml-auto flex items-center gap-2">
					<span class="text-xs text-slate-600"
						>{formatDate(root.createdAt)}</span
					>
					<button
						type="button"
						onclick={() => (editingId = editingId === root.id ? null : root.id)}
						class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
						title={m.admin_btn_edit()}
					>
						<PencilIcon class="h-4 w-4" />
					</button>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={root.id} />
						<button
							type="submit"
							class="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
							title={m.admin_btn_delete()}
							onclick={(e) => {
								if (!confirm(`Supprimer "${root.nom}" ?`)) e.preventDefault();
							}}
						>
							<TrashIcon class="h-4 w-4" />
						</button>
					</form>
				</div>
			</div>

			<!-- Formulaire d'édition pour la racine -->
			{#if editingId === root.id}
				{@render editForm(root)}
			{/if}

			<!-- Enfants -->
			{#each root.children as child (child.id)}
				<div
					class="ml-6 flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3"
				>
					<ChevronRightIcon class="h-3.5 w-3.5 shrink-0 text-slate-600" />
					{#if child.isOfficial}
						<SparklesIcon class="h-3.5 w-3.5 shrink-0 text-red-400/70" />
					{/if}
					<span class="font-medium text-white">{child.nom}</span>
					<span
						class="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400"
					>
						v{child.version}
					</span>
					{#if child.description}
						<span
							class="hidden max-w-xs truncate text-sm text-slate-500 md:block"
						>
							{child.description}
						</span>
					{/if}
					<div class="ml-auto flex items-center gap-2">
						<span class="text-xs text-slate-600"
							>{formatDate(child.createdAt)}</span
						>
						<button
							type="button"
							onclick={() =>
								(editingId = editingId === child.id ? null : child.id)}
							class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
							title={m.admin_btn_edit()}
						>
							<PencilIcon class="h-4 w-4" />
						</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={child.id} />
							<button
								type="submit"
								class="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
								title={m.admin_btn_delete()}
								onclick={(e) => {
									if (!confirm(`Supprimer "${child.nom}" ?`))
										e.preventDefault();
								}}
							>
								<TrashIcon class="h-4 w-4" />
							</button>
						</form>
					</div>
				</div>

				<!-- Formulaire d'édition pour l'enfant -->
				{#if editingId === child.id}
					{@render editForm(child)}
				{/if}
			{/each}
		{:else}
			<div
				class="rounded-xl border border-slate-800 py-12 text-center text-slate-500"
			>
				Aucun système de jeu.
			</div>
		{/each}
	</div>
</div>

{#snippet editForm(gs: GS)}
	<div class="ml-6 rounded-xl border border-red-900/30 bg-slate-900 p-5">
		{#if form?.action === "update" && form?.error}
			<p class="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				return ({ update }) => {
					update();
					editingId = null;
				};
			}}
		>
			<input type="hidden" name="id" value={gs.id} />
			<div class="space-y-4">
				<div>
					<label
						for="edit-nom-{gs.id}"
						class="mb-1.5 block text-sm font-medium text-slate-400"
					>
						{m.admin_form_name_label()} *
					</label>
					<input
						id="edit-nom-{gs.id}"
						name="nom"
						type="text"
						required
						value={gs.nom}
						class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label
							for="edit-version-{gs.id}"
							class="mb-1.5 block text-sm font-medium text-slate-400"
						>
							{m.admin_form_version_label()} *
						</label>
						<input
							id="edit-version-{gs.id}"
							name="version"
							type="text"
							required
							value={gs.version}
							class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
						/>
					</div>
					<div>
						<label
							for="edit-slug-{gs.id}"
							class="mb-1.5 block text-sm font-medium text-slate-400"
						>
							{m.admin_form_slug_label()} *
						</label>
						<input
							id="edit-slug-{gs.id}"
							name="slug"
							type="text"
							required
							value={gs.slug}
							class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
						/>
					</div>
				</div>
				<div>
					<label
						for="edit-parent-{gs.id}"
						class="mb-1.5 block text-sm font-medium text-slate-400"
					>
						{m.admin_form_parent_label()}
					</label>
					<select
						id="edit-parent-{gs.id}"
						name="parentSystemId"
						class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
					>
						<option value="" selected={!gs.parentSystemId}
							>{m.admin_form_no_parent()}</option
						>
						{#each otherSystems(gs.id) as other (other.id)}
							<option
								value={other.id}
								selected={gs.parentSystemId === other.id}
							>
								{other.nom} (v{other.version})
							</option>
						{/each}
					</select>
				</div>
				<div>
					<label
						for="edit-desc-{gs.id}"
						class="mb-1.5 block text-sm font-medium text-slate-400"
					>
						{m.admin_form_description_label()}
					</label>
					<textarea
						id="edit-desc-{gs.id}"
						name="description"
						rows="3"
						class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
						>{gs.description ?? ""}</textarea
					>
				</div>
				<label class="flex cursor-pointer items-center gap-2.5">
					<input
						type="checkbox"
						name="isOfficial"
						checked={gs.isOfficial}
						class="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-red-500"
					/>
					<span class="text-sm text-slate-300"
						>{m.admin_form_official_label()}</span
					>
				</label>
				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (editingId = null)}
						class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
					>
						{m.admin_btn_cancel()}
					</button>
					<button
						type="submit"
						class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
					>
						{m.admin_btn_save()}
					</button>
				</div>
			</div>
		</form>
	</div>
{/snippet}
