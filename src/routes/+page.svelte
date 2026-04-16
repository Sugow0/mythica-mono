<script lang="ts">
	import LanguageSwitcher from "$lib/components/language-switcher.svelte";
	import NavbarUser from "$lib/components/navbar-user.svelte";
	import * as Avatar from "$lib/components/ui/avatar";
	import { Button } from "$lib/components/ui/button";
	import * as NavigationMenu from "$lib/components/ui/navigation-menu";
	import * as m from "$lib/paraglide/messages.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const featureKeys = [
		{
			titleKey: "feature_ai_title" as const,
			descKey: "feature_ai_desc" as const,
			color: "from-teal-500 to-cyan-600",
			iconPath:
				"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
		},
		{
			titleKey: "feature_allinone_title" as const,
			descKey: "feature_allinone_desc" as const,
			color: "from-slate-600 to-slate-800",
			iconPath:
				"M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
		},
		{
			titleKey: "feature_online_title" as const,
			descKey: "feature_online_desc" as const,
			color: "from-cyan-600 to-teal-700",
			iconPath:
				"M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
		},
		{
			titleKey: "feature_modern_title" as const,
			descKey: "feature_modern_desc" as const,
			color: "from-emerald-500 to-teal-600",
			iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
		},
	];

	const featureTitles: Record<string, () => string> = {
		feature_ai_title: m.feature_ai_title,
		feature_allinone_title: m.feature_allinone_title,
		feature_online_title: m.feature_online_title,
		feature_modern_title: m.feature_modern_title,
	};

	const featureDescs: Record<string, () => string> = {
		feature_ai_desc: m.feature_ai_desc,
		feature_allinone_desc: m.feature_allinone_desc,
		feature_online_desc: m.feature_online_desc,
		feature_modern_desc: m.feature_modern_desc,
	};
</script>

<div
	class="min-h-screen bg-stone-50 text-foreground overflow-x-hidden dark:bg-background"
>
	<!-- Navbar -->
	<nav
		class="fixed top-0 left-0 right-0 z-50 border-b border-stone-200/60 bg-stone-50/90 backdrop-blur-xl dark:border-border/40 dark:bg-background/80"
	>
		<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
			<!-- Logo -->
			<a
				href="/"
				class="flex items-center gap-2.5 transition-transform hover:scale-105"
			>
				<svg aria-hidden="true" class="h-8 w-8" viewBox="0 0 40 40" fill="none">
					<rect width="40" height="40" rx="10" class="fill-teal-600" />
					<path
						d="M12 28V12h4l4 10 4-10h4v16h-3.5v-10l-3.5 8h-2l-3.5-8v10H12z"
						class="fill-white"
					/>
				</svg>
				<span
					class="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
					>Mythica</span
				>
			</a>

			<!-- Navigation -->
			<NavigationMenu.Root class="hidden md:flex">
				<NavigationMenu.List class="flex gap-1">
					<NavigationMenu.Item>
						<NavigationMenu.Trigger
							class="px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-600 dark:text-muted-foreground bg-transparent hover:bg-transparent data-[state=open]:bg-transparent"
						>
							{m.nav_campaigns()}
						</NavigationMenu.Trigger>
						<NavigationMenu.Content class="min-w-[200px]">
							<ul class="grid gap-1 p-2">
								<li>
									<NavigationMenu.Link
										href="/campaigns"
										class="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-600 dark:text-muted-foreground dark:hover:bg-teal-950 dark:hover:text-teal-400"
									>
										{m.nav_explore()}
										<span
											class="block text-xs font-normal text-slate-400 dark:text-muted-foreground/70"
											>{m.nav_explore_desc()}</span
										>
									</NavigationMenu.Link>
								</li>
								<li>
									<NavigationMenu.Link
										href="/campaigns/me"
										class="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-600 dark:text-muted-foreground dark:hover:bg-teal-950 dark:hover:text-teal-400"
									>
										{m.nav_my_campaigns()}
										<span
											class="block text-xs font-normal text-slate-400 dark:text-muted-foreground/70"
											>{m.nav_my_campaigns_desc()}</span
										>
									</NavigationMenu.Link>
								</li>
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="#features"
							class="px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-600 dark:text-muted-foreground"
						>
							{m.nav_features()}
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="#pricing"
							class="px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-600 dark:text-muted-foreground"
						>
							{m.nav_pricing()}
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="#about"
							class="px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-teal-600 dark:text-muted-foreground"
						>
							{m.nav_about()}
						</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<!-- Actions -->
			<div class="flex items-center gap-3">
				<LanguageSwitcher />
				{#if data.user}
					<NavbarUser user={data.user} />
				{:else}
					<Button
						variant="ghost"
						size="sm"
						href="/sign-in"
						class="font-medium text-slate-600 hover:text-teal-600"
					>
						{m.nav_sign_in()}
					</Button>
					<Button
						size="sm"
						href="/sign-up"
						class="bg-teal-600 text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 hover:scale-105 hover:shadow-lg"
					>
						{m.nav_get_started()}
					</Button>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section
		class="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16"
	>
		<!-- Animated background elements -->
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			<!-- Soft gradient orbs -->
			<div
				class="animate-pulse-glow absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-teal-400/15 to-cyan-500/10 blur-3xl"
			></div>
			<div
				class="animate-pulse-glow absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-500/10 blur-3xl"
				style="animation-delay: 2s;"
			></div>
			<div
				class="animate-pulse-glow absolute top-1/4 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-slate-300/20 to-stone-400/10 blur-3xl"
				style="animation-delay: 1s;"
			></div>

			<!-- Geometric floating shapes -->
			<svg
				aria-hidden="true"
				class="animate-float absolute left-[8%] top-[18%] h-16 w-16 opacity-[0.08]"
				viewBox="0 0 100 100"
			>
				<polygon
					points="50,5 95,97.5 5,97.5"
					fill="currentColor"
					class="text-teal-600"
				/>
			</svg>
			<svg
				aria-hidden="true"
				class="animate-float-delayed absolute right-[12%] top-[22%] h-20 w-20 opacity-[0.06]"
				viewBox="0 0 100 100"
			>
				<rect
					x="10"
					y="10"
					width="80"
					height="80"
					rx="8"
					fill="currentColor"
					class="text-slate-600"
				/>
			</svg>
			<svg
				aria-hidden="true"
				class="animate-float-slow absolute left-[18%] bottom-[28%] h-14 w-14 opacity-[0.07]"
				viewBox="0 0 100 100"
			>
				<circle
					cx="50"
					cy="50"
					r="45"
					fill="currentColor"
					class="text-teal-500"
				/>
			</svg>
			<svg
				aria-hidden="true"
				class="animate-float absolute right-[8%] bottom-[22%] h-12 w-12 opacity-[0.08]"
				viewBox="0 0 100 100"
			>
				<polygon
					points="50,5 95,40 77,95 23,95 5,40"
					fill="currentColor"
					class="text-emerald-600"
				/>
			</svg>
			<svg
				aria-hidden="true"
				class="animate-float-delayed absolute left-[4%] top-[48%] h-10 w-10 opacity-[0.05]"
				viewBox="0 0 100 100"
			>
				<polygon
					points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40"
					fill="currentColor"
					class="text-slate-500"
				/>
			</svg>
			<svg
				aria-hidden="true"
				class="animate-float-slow absolute right-[22%] top-[12%] h-8 w-8 opacity-[0.06]"
				viewBox="0 0 100 100"
			>
				<polygon
					points="50,0 100,50 50,100 0,50"
					fill="currentColor"
					class="text-cyan-600"
				/>
			</svg>

			<!-- Subtle dot pattern -->
			<div
				class="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"
			></div>
		</div>

		<div class="relative z-10 mx-auto max-w-4xl text-center">
			<!-- Badge -->
			<div
				class="group mb-8 inline-flex cursor-pointer items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-4 py-2 text-sm transition-all hover:scale-105 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 dark:border-teal-800 dark:bg-teal-950/50"
			>
				<span class="relative flex h-2.5 w-2.5">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"
					></span>
					<span
						class="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500"
					></span>
				</span>
				<span class="font-medium text-teal-700 dark:text-teal-300"
					>{m.hero_badge()}</span
				>
				<svg
					aria-hidden="true"
					class="h-4 w-4 transition-transform group-hover:translate-x-1"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 5l7 7-7 7"
					/>
				</svg>
			</div>

			<!-- Main heading -->
			<h1
				class="mb-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white"
			>
				<span class="block">{m.hero_title_line1()}</span>
				<span
					class="animate-gradient block bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent"
				>
					{m.hero_title_line2()}
				</span>
			</h1>

			<!-- Subtitle -->
			<p
				class="mx-auto mb-10 max-w-2xl text-lg text-slate-600 sm:text-xl leading-relaxed dark:text-muted-foreground"
			>
				{m.hero_subtitle_prefix()}
				<span class="font-medium text-slate-900 dark:text-foreground"
					>{m.hero_subtitle_modern()}</span
				>
				{m.hero_subtitle_and()}
				<span class="font-medium text-slate-900 dark:text-foreground"
					>{m.hero_subtitle_intuitive()}</span
				>
				{m.hero_subtitle_suffix()}
			</p>

			<!-- CTA buttons -->
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button
					size="lg"
					href="/sign-up"
					class="group min-w-50 bg-teal-600 text-base text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 hover:shadow-xl hover:scale-105"
				>
					{m.hero_cta_start()}
					<svg
						aria-hidden="true"
						class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</Button>
				<Button
					variant="outline"
					size="lg"
					class="group min-w-50 text-base border-2 border-slate-300 text-slate-700 hover:border-teal-500 hover:text-teal-600 transition-all hover:scale-105 dark:border-border dark:text-foreground"
				>
					<svg
						aria-hidden="true"
						class="mr-2 h-4 w-4 transition-transform group-hover:scale-110"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M8 5v14l11-7z" />
					</svg>
					{m.hero_cta_demo()}
				</Button>
			</div>

			<!-- Social proof -->
			<div class="mt-16 flex flex-col items-center gap-4">
				<div class="flex -space-x-3">
					{#each [{ letter: "A", color: "from-teal-400 to-cyan-500" }, { letter: "B", color: "from-slate-400 to-slate-600" }, { letter: "C", color: "from-emerald-400 to-teal-500" }, { letter: "D", color: "from-cyan-500 to-teal-600" }, { letter: "E", color: "from-slate-500 to-slate-700" }] as user (user.letter)}
						<Avatar.Root
							class="h-11 w-11 border-3 border-stone-50 ring-2 ring-white/50 transition-transform hover:scale-110 hover:z-10 dark:border-background"
						>
							<Avatar.Fallback
								class="bg-gradient-to-br {user.color} text-white text-xs font-bold"
							>
								{user.letter}
							</Avatar.Fallback>
						</Avatar.Root>
					{/each}
					<div
						class="flex h-11 w-11 items-center justify-center rounded-full border-3 border-stone-50 bg-slate-100 text-xs font-bold ring-2 ring-white/50 dark:border-background dark:bg-muted"
					>
						+99
					</div>
				</div>
				<p class="text-sm text-slate-500 dark:text-muted-foreground">
					{m.hero_social_proof({ count: "2,000+" })}
				</p>
			</div>
		</div>

		<!-- Scroll indicator -->
		<div class="absolute bottom-8 left-1/2 -translate-x-1/2">
			<a
				href="#features"
				class="flex flex-col items-center gap-2 text-slate-400 transition-colors hover:text-teal-500"
			>
				<span class="text-xs font-medium">{m.hero_scroll()}</span>
				<div class="h-10 w-6 rounded-full border-2 border-current p-1.5">
					<div class="h-2 w-2 animate-bounce rounded-full bg-current"></div>
				</div>
			</a>
		</div>
	</section>

	<!-- Features Section -->
	<section id="features" class="relative py-32 bg-white dark:bg-background">
		<!-- Background decoration -->
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-teal-500/20 to-transparent"
			></div>
			<div
				class="absolute left-0 bottom-0 h-px w-full bg-gradient-to-r from-transparent via-teal-500/20 to-transparent"
			></div>
		</div>

		<div class="mx-auto max-w-6xl px-6">
			<!-- Section header -->
			<div class="mb-20 text-center">
				<span
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-1.5 text-sm font-medium text-teal-700 dark:bg-teal-950 dark:text-teal-300"
				>
					<svg
						aria-hidden="true"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
					{m.features_badge()}
				</span>
				<h2
					class="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white"
				>
					{m.features_title_prefix()}
					<span class="text-teal-600 dark:text-teal-400"
						>{m.features_title_highlight()}</span
					>
				</h2>
				<p
					class="mx-auto max-w-2xl text-lg text-slate-600 dark:text-muted-foreground"
				>
					{m.features_subtitle()}
				</p>
			</div>

			<!-- Features grid -->
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each featureKeys as feature, i (feature)}
					<div
						class="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:-translate-y-2 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10 dark:border-border/50 dark:bg-card"
						style="animation-delay: {i * 100}ms"
					>
						<!-- Gradient background on hover -->
						<div
							class="absolute inset-0 bg-gradient-to-br {feature.color} opacity-0 transition-opacity duration-500 group-hover:opacity-5"
						></div>

						<!-- Icon with gradient background -->
						<div
							class="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br {feature.color} shadow-lg"
						>
							<svg
								aria-hidden="true"
								class="h-6 w-6 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d={feature.iconPath}
								/>
							</svg>
						</div>

						<h3
							class="relative mb-3 text-xl font-bold text-slate-900 dark:text-white"
						>
							{featureTitles[feature.titleKey]()}
						</h3>
						<p
							class="relative text-slate-600 leading-relaxed dark:text-muted-foreground"
						>
							{featureDescs[feature.descKey]()}
						</p>

						<!-- Decorative corner -->
						<div
							class="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gradient-to-br {feature.color} opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
						></div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- AI Feature Highlight -->
	<section class="relative overflow-hidden py-32">
		<!-- Background -->
		<div class="absolute inset-0">
			<div
				class="absolute inset-0 bg-gradient-to-b from-teal-50/80 via-cyan-50/50 to-transparent dark:from-teal-950/20 dark:via-cyan-950/10 dark:to-transparent"
			></div>
			<div
				class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.08),transparent_50%)]"
			></div>
		</div>

		<div class="relative mx-auto max-w-6xl px-6">
			<div class="grid items-center gap-16 lg:grid-cols-2">
				<div>
					<div
						class="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-600/25"
					>
						<svg
							aria-hidden="true"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							/>
						</svg>
						{m.ai_badge()}
					</div>
					<h2
						class="mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white"
					>
						{m.ai_title_line1()}<br />
						<span class="text-teal-600 dark:text-teal-400"
							>{m.ai_title_line2()}</span
						>
					</h2>
					<p
						class="mb-8 text-lg text-slate-600 leading-relaxed dark:text-muted-foreground"
					>
						{m.ai_subtitle()}
					</p>
					<ul class="space-y-4">
						{#each [{ text: m.ai_feature_narration(), icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" }, { text: m.ai_feature_npc(), icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }, { text: m.ai_feature_adapt(), icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" }, { text: m.ai_feature_rules(), icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" }] as item (item.text)}
							<li
								class="flex items-center gap-4 rounded-xl bg-white/70 px-4 py-3 shadow-sm transition-all hover:bg-white hover:shadow-md dark:bg-white/5 dark:hover:bg-white/10"
							>
								<span
									class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md"
								>
									<svg
										aria-hidden="true"
										class="h-5 w-5 text-white"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d={item.icon}
										/>
									</svg>
								</span>
								<span class="font-medium text-slate-800 dark:text-foreground"
									>{item.text}</span
								>
							</li>
						{/each}
					</ul>
				</div>

				<!-- AI Preview Card -->
				<div class="relative">
					<!-- Glow effect -->
					<div
						class="absolute -inset-4 rounded-3xl bg-gradient-to-r from-teal-500 to-cyan-600 opacity-20 blur-2xl"
					></div>

					<div
						class="relative overflow-hidden rounded-3xl border border-teal-200 bg-white p-8 shadow-2xl dark:border-teal-800 dark:bg-slate-900"
					>
						<!-- Header -->
						<div class="mb-6 flex items-center gap-4">
							<div class="relative">
								<div
									class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg"
								>
									<svg
										aria-hidden="true"
										class="h-7 w-7 text-white"
										viewBox="0 0 40 40"
										fill="currentColor"
									>
										<path
											d="M12 28V12h4l4 10 4-10h4v16h-3.5v-10l-3.5 8h-2l-3.5-8v10H12z"
										/>
									</svg>
								</div>
								<div
									class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"
								></div>
							</div>
							<div>
								<div class="text-lg font-bold text-slate-900 dark:text-white">
									{m.ai_preview_name()}
								</div>
								<div
									class="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400"
								>
									<span
										class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500"
									></span>
									<span
										class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500"
										style="animation-delay: 0.2s"
									></span>
									<span
										class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500"
										style="animation-delay: 0.4s"
									></span>
									<span class="ml-1">{m.ai_preview_typing()}</span>
								</div>
							</div>
						</div>

						<!-- Message bubble -->
						<div
							class="mb-6 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-6 dark:from-teal-950/50 dark:to-cyan-950/50"
						>
							<p
								class="text-slate-600 italic leading-relaxed dark:text-muted-foreground"
							>
								"{m.ai_preview_story()}"
							</p>
						</div>

						<!-- Action buttons -->
						<div class="flex flex-wrap gap-2">
							{#each [{ label: m.ai_action_talk(), color: "from-teal-500 to-cyan-600", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }, { label: m.ai_action_observe(), color: "from-slate-500 to-slate-700", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" }, { label: m.ai_action_leave(), color: "from-emerald-500 to-teal-600", icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" }] as action (action.label)}
								<button
									type="button"
									class="group flex items-center gap-2 rounded-full bg-gradient-to-r {action.color} px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
								>
									<svg
										aria-hidden="true"
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d={action.icon}
										/>
									</svg>
									{action.label}
								</button>
							{/each}
						</div>

						<!-- Decorative elements -->
						<div
							class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl"
						></div>
						<div
							class="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl"
						></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="relative py-32 bg-white dark:bg-background">
		<div class="mx-auto max-w-4xl px-6 text-center">
			<!-- Decorative -->
			<div class="pointer-events-none absolute inset-0">
				<div
					class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl"
				></div>
				<div
					class="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
				></div>
			</div>

			<div class="relative">
				<div
					class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg"
				>
					<svg
						aria-hidden="true"
						class="h-8 w-8 text-white"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2
					class="mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white"
				>
					{m.cta_title_prefix()}
					<span class="text-teal-600 dark:text-teal-400"
						>{m.cta_title_highlight()}</span
					> ?
				</h2>
				<p
					class="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-muted-foreground"
				>
					{m.cta_subtitle_prefix()}
					<span class="font-semibold text-slate-900 dark:text-foreground"
						>{m.cta_subtitle_highlight()}</span
					>
				</p>
				<div
					class="flex flex-col items-center justify-center gap-4 sm:flex-row"
				>
					<Button
						size="lg"
						href="/sign-up"
						class="group min-w-50 bg-teal-600 text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-700 hover:scale-105 hover:shadow-xl"
					>
						{m.cta_button()}
						<svg
							aria-hidden="true"
							class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</Button>
					<Button
						variant="ghost"
						size="lg"
						class="group text-slate-600 transition-all hover:text-teal-600 dark:text-muted-foreground"
					>
						{m.cta_learn_more()}
						<svg
							aria-hidden="true"
							class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</Button>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer
		class="relative border-t border-stone-200 bg-stone-50 py-16 dark:border-border dark:bg-background"
	>
		<div class="mx-auto max-w-6xl px-6">
			<div class="flex flex-col items-center gap-8">
				<!-- Logo -->
				<a
					href="/"
					class="flex items-center gap-3 transition-transform hover:scale-105"
				>
					<svg
						aria-hidden="true"
						class="h-10 w-10"
						viewBox="0 0 40 40"
						fill="none"
					>
						<rect width="40" height="40" rx="10" class="fill-teal-600" />
						<path
							d="M12 28V12h4l4 10 4-10h4v16h-3.5v-10l-3.5 8h-2l-3.5-8v10H12z"
							class="fill-white"
						/>
					</svg>
					<span class="text-2xl font-bold text-slate-900 dark:text-white"
						>Mythica</span
					>
				</a>

				<!-- Navigation -->
				<nav class="flex flex-wrap justify-center gap-8 text-sm">
					<a
						href="#features"
						class="text-slate-500 transition-colors hover:text-teal-600"
						>{m.footer_features()}</a
					>
					<a
						href="#pricing"
						class="text-slate-500 transition-colors hover:text-teal-600"
						>{m.footer_pricing()}</a
					>
					<a
						href="/blog"
						class="text-slate-500 transition-colors hover:text-teal-600"
						>{m.footer_blog()}</a
					>
					<a
						href="/contact"
						class="text-slate-500 transition-colors hover:text-teal-600"
						>{m.footer_contact()}</a
					>
				</nav>

				<!-- Social links -->
				<div class="flex gap-4">
					{#each [{ label: "Twitter", icon: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" }, { label: "Discord", icon: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" }, { label: "GitHub", icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" }] as social (social.label)}
						<a
							href="/"
							class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-teal-100 hover:text-teal-600 dark:bg-muted dark:hover:bg-teal-950"
							aria-label={social.label}
						>
							<svg
								aria-hidden="true"
								class="h-5 w-5"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d={social.icon} />
							</svg>
						</a>
					{/each}
				</div>

				<!-- Copyright -->
				<p class="text-sm text-slate-400">
					{m.footer_copyright()}
				</p>
			</div>
		</div>
	</footer>
</div>
