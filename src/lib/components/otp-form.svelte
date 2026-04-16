<script lang="ts">
	import { onMount } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Field from "$lib/components/ui/field";
	import * as InputOTP from "$lib/components/ui/input-otp";
	import { ApiError, authService } from "$lib/index.js";
	import { cn } from "$lib/utils.js";

	let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
		$props();

	// Determine the type of OTP verification
	let otpType = $state<"email" | "2fa">("email");
	let email = $state<string | null>(null);
	let tempToken = $state<string | null>(null);

	// OTP input state
	let otpValue = $state("");

	// UI state
	let isLoading = $state(false);
	let isResending = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	// Computed properties
	const title = $derived(
		otpType === "2fa" ? "Two-factor authentication" : "Enter verification code"
	);
	const description = $derived(
		otpType === "2fa"
			? "Enter the 6-digit code from your authenticator app."
			: `We sent a 6-digit code to ${email || "your email"}.`
	);

	onMount(() => {
		// Check URL params for type
		const type = $page.url.searchParams.get("type");
		if (type === "2fa") {
			otpType = "2fa";
			tempToken = sessionStorage.getItem("tempToken");
			email = sessionStorage.getItem("loginEmail");

			// If no temp token, redirect back to login
			if (!tempToken) {
				goto("/sign-in");
			}
		} else {
			otpType = "email";
			email = sessionStorage.getItem("verificationEmail");

			// If no email stored, this might be from a direct link with token in URL
			const tokenFromUrl = $page.url.searchParams.get("token");
			if (tokenFromUrl) {
				// Auto-verify if token is in URL
				handleUrlTokenVerification(tokenFromUrl);
			} else if (!email) {
				// No email and no token, redirect to signup
				goto("/sign-up");
			}
		}
	});

	async function handleUrlTokenVerification(token: string) {
		isLoading = true;
		error = null;

		try {
			await authService.verifyEmail(token);
			success = "Email verified successfully!";

			// Redirect to login after short delay
			setTimeout(() => {
				goto("/sign-in");
			}, 2000);
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else if (err instanceof Error) {
				error = err.message;
			} else {
				error = "Failed to verify email. Please try again.";
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		success = null;
		isLoading = true;

		try {
			if (otpType === "2fa" && tempToken) {
				// 2FA verification
				await authService.login2fa({
					tempToken,
					code: otpValue,
				});

				// Clear stored data
				sessionStorage.removeItem("tempToken");
				sessionStorage.removeItem("loginEmail");

				// Redirect to home/dashboard
				await goto("/");
			} else {
				// Email verification - the code IS the token
				await authService.verifyEmail(otpValue);

				// Clear stored email
				sessionStorage.removeItem("verificationEmail");

				success = "Email verified successfully!";

				// Redirect to login after short delay
				setTimeout(() => {
					goto("/sign-in");
				}, 2000);
			}
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else if (err instanceof Error) {
				error = err.message;
			} else {
				error = "Verification failed. Please try again.";
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleResend() {
		if (!email || otpType === "2fa") return;

		isResending = true;
		error = null;
		success = null;

		try {
			await authService.resendVerification(email);
			success = "Verification code resent successfully!";
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else if (err instanceof Error) {
				error = err.message;
			} else {
				error = "Failed to resend code. Please try again.";
			}
		} finally {
			isResending = false;
		}
	}
</script>

<div class={cn("flex flex-col gap-6", className)} {...restProps}>
	<form onsubmit={handleSubmit}>
		<Field.Group>
			<div class="flex flex-col items-center gap-1 text-center">
				<h1 class="text-2xl font-bold">{title}</h1>
				<p class="text-muted-foreground text-sm text-balance">
					{description}
				</p>
			</div>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			{#if success}
				<div class="text-center text-sm text-green-600 dark:text-green-400">
					{success}
				</div>
			{/if}

			<Field.Field>
				<Field.Label for="otp" class="sr-only">Verification code</Field.Label>
				<InputOTP.Root
					maxlength={6}
					id="otp"
					required
					bind:value={otpValue}
					disabled={isLoading}
				>
					{#snippet children({ cells })}
						<InputOTP.Group
							class="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border"
						>
							{#each cells.slice(0, 2) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group
							class="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border"
						>
							{#each cells.slice(2, 4) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group
							class="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border"
						>
							{#each cells.slice(4, 6) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
				<Field.Description class="text-center">
					Enter the 6-digit code {otpType === "2fa"
						? "from your authenticator app"
						: "sent to your email"}.
				</Field.Description>
			</Field.Field>

			<Button type="submit" disabled={isLoading || otpValue.length !== 6}>
				{#if isLoading}
					Verifying...
				{:else}
					Verify
				{/if}
			</Button>

			{#if otpType === "email"}
				<Field.Description class="text-center">
					Didn't receive the code?
					<button
						type="button"
						class="underline underline-offset-4 hover:text-primary disabled:opacity-50"
						onclick={handleResend}
						disabled={isResending}
					>
						{#if isResending}
							Resending...
						{:else}
							Resend
						{/if}
					</button>
				</Field.Description>
			{:else}
				<Field.Description class="text-center">
					<a href="/sign-in" class="underline underline-offset-4"
						>Back to login</a
					>
				</Field.Description>
			{/if}
		</Field.Group>
	</form>
</div>
