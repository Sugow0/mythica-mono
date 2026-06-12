<script lang="ts">
	import type { SubmitFunction } from "@sveltejs/kit";
	import type { HTMLFormAttributes } from "svelte/elements";
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui/button/index.js";
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel,
		FieldSeparator,
	} from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { authService } from "$lib/index.js";
	import { cn, type WithElementRef } from "$lib/utils.js";

	interface FormResult {
		error?: string;
		email?: string;
		requiresTwoFactor?: boolean;
		tempToken?: string;
	}

	let {
		ref = $bindable(null),
		class: className,
		form = null,
		...restProps
	}: WithElementRef<HTMLFormAttributes> & {
		form?: FormResult | null;
	} = $props();

	const id = $props.id();

	// UI state
	let isLoading = $state(false);
	let localError = $state<string | null>(null);
	let showPassword = $state(false);

	let error = $derived(localError ?? form?.error ?? null);

	const loginEnhance: SubmitFunction = ({ formData }) => {
		isLoading = true;
		localError = null;
		const submittedEmail = String(formData.get("email") ?? "");

		return async ({ result, update }) => {
			isLoading = false;

			if (result.type === "success" && result.data?.requiresTwoFactor) {
				const resultData = result.data as FormResult;
				sessionStorage.setItem("tempToken", resultData.tempToken ?? "");
				sessionStorage.setItem("loginEmail", submittedEmail);
				await goto("/otp?type=2fa");
				return;
			}

			if (result.type === "failure") {
				localError =
					(result.data as FormResult)?.error ?? "Une erreur est survenue.";
				return;
			}

			await update();
		};
	};

	function handleOAuth(provider: "google" | "discord" | "apple") {
		authService.redirectToOAuth(provider);
	}
</script>

<form
	method="POST"
	class={cn("flex flex-col gap-4", className)}
	bind:this={ref}
	use:enhance={loginEnhance}
	aria-busy={isLoading}
	{...restProps}
>
	<FieldGroup class="gap-3">
		<div class="flex flex-col items-center gap-0.5 text-center">
			<h1 class="text-xl font-bold">Welcome back</h1>
			<p class="text-muted-foreground text-sm">
				Sign in to your Mythica account
			</p>
		</div>

		{#if error}
			<FieldError>{error}</FieldError>
		{/if}

		<Field>
			<div class="grid grid-cols-3 gap-3">
				<Button
					variant="outline"
					type="button"
					onclick={() => handleOAuth("google")}
					disabled={isLoading}
					class="border-slate-300 hover:border-orange-500 hover:text-orange-600 dark:border-border dark:hover:border-orange-700 dark:hover:text-orange-400 transition-all hover:scale-105"
					aria-label="Sign in with Google"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="size-4"
						aria-hidden="true"
					>
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					<span class="hidden sm:inline">Google</span>
				</Button>
				<Button
					variant="outline"
					type="button"
					onclick={() => handleOAuth("discord")}
					disabled={isLoading}
					class="border-slate-300 hover:border-orange-500 hover:text-orange-600 dark:border-border dark:hover:border-orange-700 dark:hover:text-orange-400 transition-all hover:scale-105"
					aria-label="Sign in with Discord"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="size-4 text-[#5865F2]"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
						/>
					</svg>
					<span class="hidden sm:inline">Discord</span>
				</Button>
				<Button
					variant="outline"
					type="button"
					onclick={() => handleOAuth("apple")}
					disabled={isLoading}
					class="border-slate-300 hover:border-orange-500 hover:text-orange-600 dark:border-border dark:hover:border-orange-700 dark:hover:text-orange-400 transition-all hover:scale-105"
					aria-label="Sign in with Apple"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						class="size-4"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282"
						/>
					</svg>
					<span class="hidden sm:inline">Apple</span>
				</Button>
			</div>
		</Field>

		<FieldSeparator>Or sign in with email</FieldSeparator>

		<Field>
			<FieldLabel for="email-{id}">Email</FieldLabel>
			<Input
				id="email-{id}"
				name="email"
				type="email"
				placeholder="m@example.com"
				value={form?.email ?? ""}
				required
				disabled={isLoading}
			/>
		</Field>

		<Field>
			<div class="flex items-center">
				<FieldLabel for="password-{id}">Password</FieldLabel>
				<a
					href="/forgot-password"
					class="ms-auto text-sm underline-offset-4 hover:underline hover:text-orange-600 dark:hover:text-orange-400"
				>
					Forgot your password?
				</a>
			</div>
			<div class="relative">
				<Input
					id="password-{id}"
					name="password"
					type={showPassword ? "text" : "password"}
					required
					disabled={isLoading}
					class="pr-10"
				/>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3"
					onclick={() => (showPassword = !showPassword)}
					aria-label={showPassword ? "Hide password" : "Show password"}
					tabindex={-1}
				>
					{#if showPassword}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="size-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path
								d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
							/>
							<path
								d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
							/>
							<line x1="1" y1="1" x2="23" y2="23" />
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="size-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					{/if}
				</button>
			</div>
		</Field>

		<Field>
			<Button type="submit" disabled={isLoading}>
				{#if isLoading}
					Signing in...
				{:else}
					Sign in
				{/if}
			</Button>
		</Field>

		<FieldDescription class="text-center">
			Don't have an account?
			<a href="/sign-up" class="underline underline-offset-4">Sign up</a>
		</FieldDescription>
	</FieldGroup>
</form>
