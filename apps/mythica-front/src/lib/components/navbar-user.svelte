<script lang="ts">
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import SunIcon from "@lucide/svelte/icons/sun";
	import UserIcon from "@lucide/svelte/icons/user";
	import { goto, invalidateAll } from "$app/navigation";
	import type { User } from "$lib/api/types";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import * as m from "$lib/paraglide/messages.js";

	let { user }: { user: User } = $props();

	// eslint-disable-next-line svelte/prefer-writable-derived -- isDark est aussi écrit dans toggleTheme
	let isDark = $state(false);
	let avatarUrl = $state<string | null>(null);

	$effect(() => {
		isDark = document.documentElement.classList.contains("dark");
	});

	$effect(() => {
		if (user?.avatar) {
			import("$lib/index.js").then(({ userService }) => {
				userService
					.getAvatarUrl()
					.then((a) => {
						avatarUrl = a?.avatarUrl ?? null;
					})
					.catch(() => {
						avatarUrl = null;
					});
			});
		}
	});

	function toggleTheme() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	}

	async function handleLogout() {
		await fetch("/logout", { method: "POST" });
		await invalidateAll();
		goto("/");
	}

	const initials = $derived(
		user?.pseudo
			? user.pseudo.slice(0, 2).toUpperCase()
			: user?.firstName
				? (user.firstName[0] + (user.lastName?.[0] ?? "")).toUpperCase()
				: "?"
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<button
			type="button"
			class="group flex h-9 w-9 items-center justify-center rounded-full outline-none ring-2 ring-transparent transition-all hover:ring-red-500 focus-visible:ring-red-500"
			aria-label={m.user_menu_label()}
		>
			<Avatar.Root class="h-9 w-9">
				{#if avatarUrl}
					<Avatar.Image src={avatarUrl} alt={user?.pseudo} />
				{/if}
				<Avatar.Fallback
					class="bg-linear-to-br from-red-500 to-red-600 text-xs font-bold text-white"
				>
					{initials}
				</Avatar.Fallback>
			</Avatar.Root>
		</button>
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end">
		<!-- Info utilisateur -->
		<div class="px-2 py-2">
			<p class="text-sm font-semibold text-foreground">{user?.pseudo}</p>
			<p class="truncate text-xs text-muted-foreground">
				{user?.firstName}
				{user?.lastName}
			</p>
		</div>

		<DropdownMenu.Separator />

		<DropdownMenu.Item onclick={() => goto("/profile")}>
			<UserIcon class="h-4 w-4 text-muted-foreground" />
			{m.user_menu_profile()}
		</DropdownMenu.Item>

		{#if user?.role === "ADMIN"}
			<DropdownMenu.Item onclick={() => goto("/admin")}>
				<ShieldIcon class="h-4 w-4 text-muted-foreground" />
				{m.user_menu_admin()}
			</DropdownMenu.Item>
		{/if}

		<DropdownMenu.Item onclick={toggleTheme}>
			{#if isDark}
				<SunIcon class="h-4 w-4 text-muted-foreground" />
				{m.user_menu_light_mode()}
			{:else}
				<MoonIcon class="h-4 w-4 text-muted-foreground" />
				{m.user_menu_dark_mode()}
			{/if}
		</DropdownMenu.Item>

		<DropdownMenu.Separator />

		<DropdownMenu.Item
			onclick={handleLogout}
			class="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
		>
			<LogOutIcon class="h-4 w-4" />
			{m.user_menu_logout()}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
