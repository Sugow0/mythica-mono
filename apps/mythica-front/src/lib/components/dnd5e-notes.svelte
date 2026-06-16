<script lang="ts">
	import { untrack } from "svelte";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import { debounce } from "$lib/utils/debounce";
	import { renderMarkdown } from "$lib/utils/markdown";

	type Notes = Record<string, string>;

	const SECTIONS = [
		{ key: "backstory", label: "Histoire" },
		{ key: "allies", label: "Alliés" },
		{ key: "enemies", label: "Ennemis" },
		{ key: "sessionNotes", label: "Notes de session" },
	];

	let { values = {}, onSave }: { values?: Notes; onSave?: (v: Notes) => void } =
		$props();

	let notes = $state<Notes>(
		untrack(() => {
			const out: Notes = {};
			for (const s of SECTIONS) out[s.key] = values[s.key] ?? "";
			return out;
		})
	);
	let preview = $state(false);

	const saveDebounced = debounce(() => onSave?.({ ...notes }), 1000);
</script>

<div class="space-y-4">
	<div class="flex justify-end">
		<div class="flex rounded-lg border border-border p-0.5 text-xs font-medium">
			<button
				type="button"
				onclick={() => (preview = false)}
				class="rounded-md px-3 py-1 {preview
					? 'text-muted-foreground'
					: 'bg-primary text-primary-foreground'}"
			>
				Édition
			</button>
			<button
				type="button"
				onclick={() => (preview = true)}
				class="rounded-md px-3 py-1 {preview
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground'}"
			>
				Aperçu
			</button>
		</div>
	</div>

	{#each SECTIONS as section (section.key)}
		<div class="space-y-1">
			<Label for="note-{section.key}">{section.label}</Label>
			{#if preview}
				<div
					class="prose prose-sm dark:prose-invert min-h-16 max-w-none rounded-lg border border-border bg-muted/20 p-3 text-sm"
					data-testid="preview-{section.key}"
				>
					<!-- renderMarkdown échappe le HTML puis n'injecte qu'un sous-ensemble
					     sûr (liens http(s) uniquement) : pas de vecteur XSS. -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderMarkdown(notes[section.key])}
				</div>
			{:else}
				<Textarea
					id="note-{section.key}"
					bind:value={notes[section.key]}
					oninput={saveDebounced}
					aria-label={section.label}
					rows={4}
					class="resize-y"
					placeholder="Markdown supporté (**gras**, *italique*, # titres, - listes, [lien](https://…))"
				/>
			{/if}
		</div>
	{/each}
</div>
