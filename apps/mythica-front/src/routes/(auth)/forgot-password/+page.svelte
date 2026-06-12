<script lang="ts">
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

	let email = $state("");
	let isLoading = $state(false);
	let sent = $state(false);
	let error = $state<string | null>(null);

	const isValid = $derived(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()));

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		if (!isValid) {
			error = "Veuillez saisir une adresse email valide.";
			return;
		}
		isLoading = true;
		try {
			await authService.forgotPassword(email.trim());
			sent = true;
		} catch (err) {
			error =
				err instanceof ApiError ? err.message : "Une erreur est survenue.";
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Mot de passe oublié - Mythica</title>
</svelte:head>

<AuthShell>
	<div class="mb-6 text-center">
		<h1 class="text-2xl font-bold">Mot de passe oublié</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Saisissez votre email pour recevoir un lien de réinitialisation.
		</p>
	</div>

	{#if sent}
		<div
			class="rounded-lg bg-orange-500/10 px-4 py-3 text-center text-sm text-orange-600 dark:text-orange-400"
		>
			Si un compte correspond à cette adresse, un email de réinitialisation
			vient d'être envoyé.
		</div>
		<div class="mt-4 text-center">
			<a href="/sign-in" class="text-sm underline underline-offset-4">
				Retour à la connexion
			</a>
		</div>
	{:else}
		<form onsubmit={handleSubmit}>
			<FieldGroup class="gap-4">
				{#if error}
					<div
						class="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500"
					>
						{error}
					</div>
				{/if}
				<Field>
					<FieldLabel for="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="vous@exemple.com"
						bind:value={email}
						required
						disabled={isLoading}
					/>
					<FieldDescription>Le lien sera valable 1 heure.</FieldDescription>
				</Field>
				<Button type="submit" disabled={isLoading || !isValid}>
					{isLoading ? "Envoi..." : "Envoyer le lien"}
				</Button>
			</FieldGroup>
		</form>
		<div class="mt-4 text-center">
			<a href="/sign-in" class="text-sm underline underline-offset-4">
				Retour à la connexion
			</a>
		</div>
	{/if}
</AuthShell>
