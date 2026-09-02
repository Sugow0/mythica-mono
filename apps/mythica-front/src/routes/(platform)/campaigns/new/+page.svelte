<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import ImageIcon from "@lucide/svelte/icons/image";
	import LockIcon from "@lucide/svelte/icons/lock";
	import SwordsIcon from "@lucide/svelte/icons/swords";
	import XIcon from "@lucide/svelte/icons/x";
	import { goto } from "$app/navigation";
	import GameSystemSelector from "$lib/components/game-system-selector.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel,
	} from "$lib/components/ui/field/index.js";
	import TagInput from "$lib/components/tag-input.svelte";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { ApiError, campaignService } from "$lib/index.js";
	const id = $props.id();

	// Couverture
	const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
	const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10 Mo

	// Form state
	let name = $state("");
	let description = $state("");
	let visibility = $state<"PUBLIC" | "PRIVATE">("PRIVATE");
	let gameSystemId = $state("");
	let tags = $state<string[]>([]);
	let coverFile = $state<File | null>(null);
	let coverPreview = $state<string | null>(null);
	let coverError = $state<string | null>(null);

	// UI state
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let nameError = $state<string | null>(null);
	let gameSystemError = $state<string | null>(null);

	// Derived
	const nameLength = $derived(name.length);
	const descriptionLength = $derived(description.length);
	const isValid = $derived(
		name.trim().length >= 3 &&
			name.trim().length <= 100 &&
			gameSystemId.length > 0
	);

	function onCoverChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		coverError = null;
		if (!file) return;
		if (!ALLOWED_COVER_TYPES.includes(file.type)) {
			coverError = "Format non supporte. Utilisez JPEG, PNG ou WebP.";
			input.value = "";
			return;
		}
		if (file.size > MAX_COVER_SIZE) {
			coverError = "Image trop volumineuse (max. 10 Mo).";
			input.value = "";
			return;
		}
		if (coverPreview) URL.revokeObjectURL(coverPreview);
		coverFile = file;
		coverPreview = URL.createObjectURL(file);
	}

	function removeCover() {
		if (coverPreview) URL.revokeObjectURL(coverPreview);
		coverFile = null;
		coverPreview = null;
		coverError = null;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		nameError = null;
		gameSystemError = null;

		// Validate
		if (name.trim().length < 3) {
			nameError = "Le nom doit contenir au moins 3 caracteres.";
			return;
		}
		if (name.trim().length > 100) {
			nameError = "Le nom ne peut pas depasser 100 caracteres.";
			return;
		}
		if (!gameSystemId) {
			gameSystemError = "Veuillez selectionner un systeme de jeu.";
			return;
		}

		isLoading = true;

		try {
			const response = await campaignService.createCampaign({
				nom: name.trim(),
				description: description.trim() || undefined,
				isPublic: visibility === "PUBLIC",
				gameSystemId,
				tags: tags.length > 0 ? tags : undefined,
			});

			const campaignId = response?.id;

			if (campaignId) {
				// La couverture est optionnelle : un echec d'upload ne doit pas
				// bloquer la creation de la campagne.
				if (coverFile) {
					try {
						await campaignService.uploadCoverImage(campaignId, coverFile);
					} catch {
						// On poursuit : la couverture pourra etre ajoutee plus tard.
					}
				}
				await goto(`/campaigns/${campaignId}`);
			} else {
				await goto("/campaigns");
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else if (err instanceof Error) {
				error = err.message;
			} else {
				error = "Une erreur inattendue est survenue.";
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<!-- Content -->
<div class="mx-auto max-w-2xl px-6 py-8">
	<!-- Back link -->
	<Button
		variant="ghost"
		href="/campaigns"
		class="mb-6 -ml-2 text-slate-600 hover:text-red-600 dark:text-muted-foreground"
	>
		<ArrowLeftIcon class="h-4 w-4" />
		Retour aux campagnes
	</Button>

	<!-- Header -->
	<div class="mb-8">
		<div
			class="mb-3 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
		>
			<SwordsIcon class="h-4 w-4" />
			Nouvelle campagne
		</div>
		<h1
			class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
		>
			Creer une campagne
		</h1>
		<p class="mt-2 text-slate-600 dark:text-muted-foreground">
			Configurez votre nouvelle aventure et invitez vos joueurs.
		</p>
	</div>

	<!-- Form -->
	<Card.Root class="overflow-hidden">
		<form onsubmit={handleSubmit} aria-busy={isLoading}>
			<Card.Content class="pt-6">
				<FieldGroup class="gap-5">
					{#if error}
						<div
							class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
						>
							{error}
						</div>
					{/if}

					<!-- Cover image -->
					<Field>
						<FieldLabel for="cover-{id}">Image de couverture</FieldLabel>
						{#if coverPreview}
							<div
								class="group relative aspect-video w-full overflow-hidden rounded-xl border border-border"
							>
								<img
									src={coverPreview}
									alt="Apercu de la couverture"
									class="h-full w-full object-cover"
								/>
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
								></div>
								<button
									type="button"
									onclick={removeCover}
									disabled={isLoading}
									aria-label="Retirer l'image"
									class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
								>
									<XIcon class="h-4 w-4" />
								</button>
								<label
									class="absolute bottom-3 left-3 cursor-pointer rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition hover:bg-white"
								>
									Changer l'image
									<input
										type="file"
										accept="image/jpeg,image/png,image/webp"
										class="sr-only"
										disabled={isLoading}
										onchange={onCoverChange}
									/>
								</label>
							</div>
						{:else}
							<label
								for="cover-{id}"
								class="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
							>
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-primary"
								>
									<ImageIcon class="h-6 w-6" />
								</div>
								<div>
									<div class="text-sm font-medium text-foreground">
										Ajouter une image de couverture
									</div>
									<div class="mt-0.5 text-xs text-muted-foreground">
										JPEG, PNG ou WebP · format 16:9 conseille · max 10 Mo
									</div>
								</div>
								<input
									id="cover-{id}"
									type="file"
									accept="image/jpeg,image/png,image/webp"
									class="sr-only"
									disabled={isLoading}
									onchange={onCoverChange}
								/>
							</label>
						{/if}
						{#if coverError}
							<FieldError>{coverError}</FieldError>
						{:else}
							<FieldDescription>
								Optionnel. Donnez une identite visuelle a votre campagne.
							</FieldDescription>
						{/if}
					</Field>

					<!-- Name -->
					<Field>
						<FieldLabel for="name-{id}">Nom de la campagne</FieldLabel>
						<Input
							id="name-{id}"
							type="text"
							placeholder="La Quete de l'Epee Sacree..."
							bind:value={name}
							required
							disabled={isLoading}
							minlength={3}
							maxlength={100}
							aria-invalid={!!nameError}
						/>
						<div class="flex items-center justify-between">
							{#if nameError}
								<FieldError>{nameError}</FieldError>
							{:else}
								<FieldDescription>Entre 3 et 100 caracteres.</FieldDescription>
							{/if}
							<span class="text-xs text-slate-400 dark:text-muted-foreground"
								>{nameLength}/100</span
							>
						</div>
					</Field>

					<!-- Description -->
					<Field>
						<FieldLabel for="description-{id}">Description</FieldLabel>
						<Textarea
							id="description-{id}"
							placeholder="Decrivez votre campagne, son univers, son ambiance..."
							bind:value={description}
							disabled={isLoading}
							maxlength={2000}
							rows={5}
							class="resize-none"
						/>
						<div class="flex items-center justify-between">
							<FieldDescription
								>Optionnel. Maximum 2000 caracteres.</FieldDescription
							>
							<span class="text-xs text-slate-400 dark:text-muted-foreground"
								>{descriptionLength}/2000</span
							>
						</div>
					</Field>

					<!-- Game System -->
					<Field>
						<FieldLabel for="game-system-{id}">Systeme de jeu</FieldLabel>
						<GameSystemSelector
							id="game-system-{id}"
							bind:value={gameSystemId}
							disabled={isLoading}
							invalid={!!gameSystemError}
						/>
						{#if gameSystemError}
							<FieldError>{gameSystemError}</FieldError>
						{:else}
							<FieldDescription>
								Le systeme de regles utilise pour cette campagne.
							</FieldDescription>
						{/if}
					</Field>

					<!-- Tags -->
					<Field>
						<FieldLabel for="tags-{id}">Tags</FieldLabel>
						<TagInput id="tags-{id}" bind:tags disabled={isLoading} />
						<FieldDescription>
							Optionnel. Genres et thèmes (ex: medfan, sci-fi, post-apo) — max
							10.
						</FieldDescription>
					</Field>

					<!-- Visibility -->
					<Field>
						<FieldLabel>Visibilite</FieldLabel>
						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								onclick={() => (visibility = "PRIVATE")}
								disabled={isLoading}
								class="flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all {visibility ===
								'PRIVATE'
									? 'border-red-500 bg-red-50/50 shadow-sm dark:border-red-600 dark:bg-red-950/30'
									: 'border-slate-200 bg-white hover:border-slate-300 dark:border-border dark:bg-card dark:hover:border-border/80'}"
							>
								<div
									class="flex h-12 w-12 items-center justify-center rounded-xl {visibility ===
									'PRIVATE'
										? 'bg-red-100 dark:bg-red-900/50'
										: 'bg-slate-100 dark:bg-muted'}"
								>
									<LockIcon
										class="h-5 w-5 {visibility === 'PRIVATE'
											? 'text-red-600 dark:text-red-400'
											: 'text-slate-500 dark:text-muted-foreground'}"
									/>
								</div>
								<div class="text-center">
									<div
										class="text-sm font-semibold text-slate-900 dark:text-white"
									>
										Privee
									</div>
									<div
										class="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground"
									>
										Sur invitation uniquement
									</div>
								</div>
							</button>

							<button
								type="button"
								onclick={() => (visibility = "PUBLIC")}
								disabled={isLoading}
								class="flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all {visibility ===
								'PUBLIC'
									? 'border-red-500 bg-red-50/50 shadow-sm dark:border-red-600 dark:bg-red-950/30'
									: 'border-slate-200 bg-white hover:border-slate-300 dark:border-border dark:bg-card dark:hover:border-border/80'}"
							>
								<div
									class="flex h-12 w-12 items-center justify-center rounded-xl {visibility ===
									'PUBLIC'
										? 'bg-red-100 dark:bg-red-900/50'
										: 'bg-slate-100 dark:bg-muted'}"
								>
									<GlobeIcon
										class="h-5 w-5 {visibility === 'PUBLIC'
											? 'text-red-600 dark:text-red-400'
											: 'text-slate-500 dark:text-muted-foreground'}"
									/>
								</div>
								<div class="text-center">
									<div
										class="text-sm font-semibold text-slate-900 dark:text-white"
									>
										Publique
									</div>
									<div
										class="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground"
									>
										Visible par tous
									</div>
								</div>
							</button>
						</div>
						<FieldDescription>
							{#if visibility === "PUBLIC"}
								La campagne sera visible dans la liste publique et les joueurs
								pourront la rejoindre librement.
							{:else}
								Seuls les joueurs invites pourront voir et rejoindre la
								campagne.
							{/if}
						</FieldDescription>
					</Field>
				</FieldGroup>
			</Card.Content>

			<Card.Footer
				class="flex items-center justify-between border-t bg-slate-50/50 dark:bg-muted/20"
			>
				<Button variant="outline" href="/campaigns" disabled={isLoading}>
					Annuler
				</Button>
				<Button
					type="submit"
					disabled={isLoading || !isValid}
					class="bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700"
				>
					{#if isLoading}
						Creation en cours...
					{:else}
						Creer la campagne
					{/if}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
