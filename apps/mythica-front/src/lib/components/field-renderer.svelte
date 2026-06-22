<script lang="ts">
	import type { CharacterSheetField } from "$lib/api/services/character-service";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";

	type Props = {
		/** Propriété (mapping système) à rendre. */
		property: CharacterSheetField;
		/** Valeur courante (JSON brut). */
		value: unknown;
		/** Notifie une nouvelle valeur (le parent gère l'auto-save). */
		onChange?: (value: unknown) => void;
		disabled?: boolean;
		id?: string;
	};

	let { property, value, onChange, disabled = false, id }: Props = $props();

	const fieldId = $derived(id ?? `field-${property.propertyId}`);

	/** Options { values: string[] } pour select / multiselect. */
	const options = $derived.by<string[]>(() => {
		const opts = property.options as { values?: unknown } | null;
		const values = opts?.values;
		return Array.isArray(values) ? values.map((v) => String(v)) : [];
	});

	function emit(v: unknown) {
		onChange?.(v);
	}

	// --- helpers de coercition (la valeur JSON peut arriver en string) ---
	function asString(v: unknown): string {
		if (v === null || v === undefined) return "";
		if (typeof v === "object") return "";
		return String(v);
	}
	function asBoolean(v: unknown): boolean {
		return v === true || v === "true";
	}
	function asResource(v: unknown): { current: number | ""; max: number | "" } {
		const r = (v ?? {}) as { current?: unknown; max?: unknown };
		const num = (x: unknown): number | "" =>
			x === "" || x === null || x === undefined || Number.isNaN(Number(x))
				? ""
				: Number(x);
		return { current: num(r.current), max: num(r.max) };
	}

	const selected = $derived(asString(value));
	const multiSelected = $derived(
		Array.isArray(value) ? (value as unknown[]).map((v) => String(v)) : []
	);
	const resource = $derived(asResource(value));

	function toggleMulti(opt: string, checked: boolean) {
		const without = multiSelected.filter((v) => v !== opt);
		emit(checked ? [...without, opt] : without);
	}

	function updateResource(part: "current" | "max", raw: string) {
		const next = {
			...asResource(value),
			[part]: raw === "" ? "" : Number(raw),
		};
		emit(next);
	}
</script>

<div class="flex flex-col gap-1.5" data-testid="field-{property.key}">
	<div class="flex items-baseline justify-between gap-2">
		<Label for={fieldId} class="text-sm font-medium">
			{property.label}
			{#if property.isRequired}
				<span class="text-destructive" aria-hidden="true">*</span>
			{/if}
		</Label>
		{#if property.type === "derived"}
			<span class="text-muted-foreground text-xs">calculé</span>
		{/if}
	</div>

	{#if property.type === "number"}
		<Input
			id={fieldId}
			type="number"
			{disabled}
			value={asString(value)}
			oninput={(e) => {
				const raw = e.currentTarget.value;
				emit(raw === "" ? "" : Number(raw));
			}}
		/>
	{:else if property.type === "boolean"}
		<div class="flex h-9 items-center">
			<Checkbox
				id={fieldId}
				{disabled}
				checked={asBoolean(value)}
				onCheckedChange={(checked) => emit(checked === true)}
			/>
		</div>
	{:else if property.type === "textarea"}
		<Textarea
			id={fieldId}
			{disabled}
			value={asString(value)}
			oninput={(e) => emit(e.currentTarget.value)}
		/>
	{:else if property.type === "select"}
		<select
			id={fieldId}
			{disabled}
			value={selected}
			onchange={(e) => emit(e.currentTarget.value)}
			class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50"
		>
			<option value="">—</option>
			{#each options as opt (opt)}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	{:else if property.type === "multiselect"}
		<div class="flex flex-wrap gap-3 py-1">
			{#each options as opt (opt)}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox
						{disabled}
						checked={multiSelected.includes(opt)}
						onCheckedChange={(c) => toggleMulti(opt, c === true)}
					/>
					{opt}
				</label>
			{/each}
		</div>
	{:else if property.type === "resource"}
		<!-- Vue basique current/max ; les cases cliquables arrivent en FEAT-197. -->
		<div class="flex items-center gap-2">
			<Input
				id={fieldId}
				type="number"
				aria-label="{property.label} actuel"
				{disabled}
				value={resource.current === "" ? "" : String(resource.current)}
				oninput={(e) => updateResource("current", e.currentTarget.value)}
				class="w-20"
			/>
			<span class="text-muted-foreground" aria-hidden="true">/</span>
			<Input
				type="number"
				aria-label="{property.label} max"
				{disabled}
				value={resource.max === "" ? "" : String(resource.max)}
				oninput={(e) => updateResource("max", e.currentTarget.value)}
				class="w-20"
			/>
		</div>
	{:else if property.type === "derived"}
		<!-- Lecture seule ; le calcul des dérivées arrive en FEAT-195. -->
		<Input
			id={fieldId}
			readonly
			disabled
			value={value === null || value === undefined ? "—" : asString(value)}
			title={property.formula ?? undefined}
		/>
	{:else if property.type === "list"}
		<!-- Fallback JSON ; l'éditeur d'inventaire riche arrive en FEAT-198. -->
		<Textarea
			id={fieldId}
			{disabled}
			value={value == null ? "" : JSON.stringify(value, null, 2)}
			oninput={(e) => {
				try {
					emit(JSON.parse(e.currentTarget.value));
				} catch {
					/* saisie incomplète : on attend un JSON valide */
				}
			}}
		/>
	{:else}
		<!-- text + tout type non spécialisé -->
		<Input
			id={fieldId}
			{disabled}
			value={asString(value)}
			oninput={(e) => emit(e.currentTarget.value)}
		/>
	{/if}

	{#if property.description}
		<p class="text-muted-foreground text-xs">{property.description}</p>
	{/if}
</div>
