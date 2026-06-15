<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import AuthShell from "$lib/components/auth-shell.svelte";
	import { Button } from "$lib/components/ui/button";
	import {
		Field,
		FieldDescription,
		FieldGroup,
		FieldLabel,
	} from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input";
	import { ApiError, authService } from "$lib/index.js";

	const token = page.params.token ?? "";

	let password = $state("");
	let confirm = $state("");
	let isLoading = $state(false);
	let done = $state(false);
	let error = $state<string | null>(null);

	const tooShort = $derived(password.length > 0 && password.length < 8);
	const mismatch = $derived(confirm.length > 0 && confirm !== password);
	const isValid = $derived(password.length >= 8 && confirm === password);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		if (!isValid) {
			error = "Vérifiez le mot de passe (8 caractères min, identiques).";
			return;
		}
		isLoading = true;
		try {
			await authService.resetPassword(token, password);
			done = true;
			setTimeout(() => goto("/sign-in"), 1500);
		} catch (err) {
			error =
				err instanceof ApiError ? err.message : "Une erreur est survenue.";
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Nouveau mot de passe - Mythica</title>
</svelte:head>

<AuthShell>
	<div class="mb-6 text-center">
		<h1 class="text-2xl font-bold">Nouveau mot de passe</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Choisissez un nouveau mot de passe pour votre compte.
		</p>
	</div>

	{#if done}
		<div
			class="rounded-lg bg-red-500/10 px-4 py-3 text-center text-sm text-red-600 dark:text-red-400"
		>
			Mot de passe réinitialisé. Redirection vers la connexion...
		</div>
	{:else}
		<form onsubmit={handleSubmit}>
			<FieldGroup class="gap-4">
				{#if error}
					<div class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
						{error}
					</div>
				{/if}
				<Field>
					<FieldLabel for="password">Nouveau mot de passe</FieldLabel>
					<Input
						id="password"
						type="password"
						bind:value={password}
						required
						minlength={8}
						disabled={isLoading}
						aria-invalid={tooShort}
					/>
					<FieldDescription>8 caractères minimum.</FieldDescription>
				</Field>
				<Field>
					<FieldLabel for="confirm">Confirmer</FieldLabel>
					<Input
						id="confirm"
						type="password"
						bind:value={confirm}
						required
						disabled={isLoading}
						aria-invalid={mismatch}
					/>
					{#if mismatch}
						<FieldDescription class="text-red-500">
							Les mots de passe ne correspondent pas.
						</FieldDescription>
					{/if}
				</Field>
				<Button type="submit" disabled={isLoading || !isValid}>
					{isLoading ? "Réinitialisation..." : "Réinitialiser"}
				</Button>
			</FieldGroup>
		</form>
	{/if}
</AuthShell>
