<script lang="ts">
	import CameraIcon from "@lucide/svelte/icons/camera";
	import { onMount } from "svelte";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import {
		Field,
		FieldDescription,
		FieldGroup,
		FieldLabel,
	} from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Textarea } from "$lib/components/ui/textarea";
	import { ApiError, userService } from "$lib/index.js";

	type Me = NonNullable<Awaited<ReturnType<typeof userService.getMe>>>["user"];

	let me = $state<Me | null>(null);
	let avatarUrl = $state<string | null>(null);
	let pseudo = $state("");
	let bio = $state("");

	let isLoading = $state(true);
	let isSaving = $state(false);
	let isUploading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	const bioLength = $derived(bio.length);
	const dirty = $derived(
		!!me &&
			(pseudo.trim() !== me.pseudo || (bio.trim() || "") !== (me.bio ?? ""))
	);
	const isValid = $derived(
		pseudo.trim().length >= 3 && pseudo.trim().length <= 50
	);
	const initials = $derived((me?.pseudo ?? "?").slice(0, 2).toUpperCase());

	async function loadMe() {
		isLoading = true;
		error = null;
		try {
			const response = await userService.getMe();
			me = response?.user ?? null;
			if (me) {
				pseudo = me.pseudo;
				bio = me.bio ?? "";
				if (me.avatar) {
					try {
						const a = await userService.getAvatarUrl();
						avatarUrl = a?.avatarUrl ?? null;
					} catch {
						avatarUrl = null;
					}
				}
			}
		} catch {
			error = "Impossible de charger votre profil.";
		} finally {
			isLoading = false;
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		success = null;
		if (!isValid) {
			error = "Le pseudo doit contenir entre 3 et 50 caracteres.";
			return;
		}
		isSaving = true;
		try {
			const response = await userService.updateProfile({
				pseudo: pseudo.trim(),
				bio: bio.trim() || null,
			});
			me = response?.user ?? me;
			success = "Profil mis a jour.";
		} catch (err) {
			error =
				err instanceof ApiError ? err.message : "Echec de la mise a jour.";
		} finally {
			isSaving = false;
		}
	}

	async function onAvatarChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		error = null;
		success = null;
		isUploading = true;
		try {
			await userService.uploadAvatar(file);
			const a = await userService.getAvatarUrl();
			avatarUrl = a?.avatarUrl ?? null;
			if (me) me.avatar = "uploaded";
			success = "Avatar mis a jour.";
		} catch (err) {
			error =
				err instanceof ApiError
					? err.message
					: "Echec de l'upload de l'avatar.";
		} finally {
			isUploading = false;
			input.value = "";
		}
	}

	onMount(loadMe);
</script>

<div class="mx-auto max-w-2xl px-6 py-8">
	<h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
		Profil
	</h1>
	<p class="mt-1 text-slate-500 dark:text-muted-foreground">
		Gerez vos informations publiques.
	</p>

	{#if isLoading}
		<Skeleton class="mt-6 h-64 w-full rounded-xl" />
	{:else if !me}
		<p class="mt-6 text-red-500">{error ?? "Profil indisponible."}</p>
	{:else}
		{#if error}
			<p class="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
				{error}
			</p>
		{/if}
		{#if success}
			<p
				class="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
			>
				{success}
			</p>
		{/if}

		<Card.Root class="mt-6">
			<Card.Content class="pt-6">
				<!-- Avatar -->
				<div class="mb-6 flex items-center gap-4">
					<Avatar.Root class="h-20 w-20">
						{#if avatarUrl}
							<Avatar.Image src={avatarUrl} alt={me.pseudo} />
						{/if}
						<Avatar.Fallback
							class="bg-gradient-to-br from-red-500 to-red-600 text-xl font-bold text-white"
						>
							{initials}
						</Avatar.Fallback>
					</Avatar.Root>
					<div>
						<label
							for="avatar-input"
							class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
						>
							<CameraIcon class="h-4 w-4" />
							{isUploading ? "Envoi..." : "Changer l'avatar"}
						</label>
						<input
							id="avatar-input"
							type="file"
							accept="image/*"
							class="hidden"
							disabled={isUploading}
							onchange={onAvatarChange}
						/>
						<p class="mt-1 text-xs text-slate-400">PNG ou JPG.</p>
					</div>
				</div>

				<form onsubmit={save}>
					<FieldGroup class="gap-5">
						<Field>
							<FieldLabel for="email">Email</FieldLabel>
							<Input id="email" type="email" value={me.email} disabled />
							<FieldDescription>
								Pour changer d'email, utilisez les parametres de securite.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel for="pseudo">Pseudo</FieldLabel>
							<Input
								id="pseudo"
								type="text"
								bind:value={pseudo}
								required
								minlength={3}
								maxlength={50}
								disabled={isSaving}
							/>
							<FieldDescription>Entre 3 et 50 caracteres.</FieldDescription>
						</Field>

						<Field>
							<FieldLabel for="bio">Bio</FieldLabel>
							<Textarea
								id="bio"
								bind:value={bio}
								maxlength={500}
								rows={4}
								disabled={isSaving}
								class="resize-none"
								placeholder="Parlez un peu de vous..."
							/>
							<div class="flex justify-between">
								<FieldDescription
									>Optionnel. Max 500 caracteres.</FieldDescription
								>
								<span class="text-xs text-slate-400">{bioLength}/500</span>
							</div>
						</Field>

						<div class="flex justify-end">
							<Button
								type="submit"
								disabled={isSaving || !dirty || !isValid}
								class="bg-red-600 text-white hover:bg-red-700"
							>
								{isSaving ? "Enregistrement..." : "Enregistrer"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
