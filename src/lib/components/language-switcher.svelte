<script lang="ts">
	import { page } from "$app/state";
	import {
		Content,
		Item,
		Root,
		Trigger,
	} from "$lib/components/ui/dropdown-menu";
	import { getLocale, locales, localizeHref } from "$lib/paraglide/runtime";

	const flags: Record<string, string> = {
		fr: "\u{1F1EB}\u{1F1F7}",
		en: "\u{1F1EC}\u{1F1E7}",
		es: "\u{1F1EA}\u{1F1F8}",
	};

	const labels: Record<string, string> = {
		fr: "Fran\u00e7ais",
		en: "English",
		es: "Espa\u00f1ol",
	};

	let currentLocale = $derived(getLocale());
</script>

<Root>
	<Trigger>
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full text-lg outline-none ring-2 ring-transparent transition-all hover:ring-teal-500 focus-visible:ring-teal-500 hover:bg-slate-100 dark:hover:bg-muted"
			aria-label="Change language"
		>
			{flags[currentLocale] ?? flags.fr}
		</button>
	</Trigger>

	<Content align="end" class="min-w-[140px]">
		{#each locales as locale (locale)}
			<Item>
				<a
					href={localizeHref(page.url.pathname, { locale })}
					data-sveltekit-reload
					class="flex w-full items-center gap-2.5 px-1 py-0.5 {locale ===
					currentLocale
						? 'font-semibold text-teal-600 dark:text-teal-400'
						: ''}"
				>
					<span class="text-base">{flags[locale]}</span>
					<span>{labels[locale]}</span>
					{#if locale === currentLocale}
						<svg
							aria-hidden="true"
							class="ml-auto h-4 w-4 text-teal-600 dark:text-teal-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{/if}
				</a>
			</Item>
		{/each}
	</Content>
</Root>
