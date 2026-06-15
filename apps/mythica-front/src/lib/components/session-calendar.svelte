<script lang="ts">
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import {
		buildCalendar,
		dayKey,
		groupByDay,
		monthLabel,
		shiftMonth,
	} from "$lib/utils/session-calendar";

	type CalendarSession = {
		id: string;
		nom: string;
		status: string;
		scheduledAt?: unknown;
	};

	let { sessions = [] }: { sessions?: CalendarSession[] } = $props();

	const now = new Date();
	let viewYear = $state(now.getFullYear());
	let viewMonth = $state(now.getMonth());

	const weeks = $derived(buildCalendar(viewYear, viewMonth));
	const byDay = $derived(groupByDay(sessions));
	const todayKey = dayKey(now);

	const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

	function go(delta: number) {
		const next = shiftMonth(viewYear, viewMonth, delta);
		viewYear = next.year;
		viewMonth = next.month;
	}

	function toToday() {
		viewYear = now.getFullYear();
		viewMonth = now.getMonth();
	}
</script>

<div>
	<!-- En-tête : mois + navigation -->
	<div class="mb-3 flex items-center justify-between">
		<h3 class="font-display text-base font-semibold capitalize">
			{monthLabel(viewYear, viewMonth)}
		</h3>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={toToday}
				class="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				Aujourd'hui
			</button>
			<button
				type="button"
				onclick={() => go(-1)}
				aria-label="Mois précédent"
				class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<ChevronLeftIcon class="h-4 w-4" />
			</button>
			<button
				type="button"
				onclick={() => go(1)}
				aria-label="Mois suivant"
				class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<ChevronRightIcon class="h-4 w-4" />
			</button>
		</div>
	</div>

	<!-- Jours de la semaine -->
	<div
		class="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-medium text-muted-foreground"
	>
		{#each weekDays as day (day)}
			<div>{day}</div>
		{/each}
	</div>

	<!-- Grille -->
	<div class="grid grid-cols-7">
		{#each weeks as week, w (w)}
			{#each week as day (day.key)}
				{@const daySessions = byDay.get(day.key) ?? []}
				{@const isToday = day.key === todayKey}
				<div
					class="min-h-[4.5rem] border-b border-r border-border/50 p-1 {day.inMonth
						? ''
						: 'bg-muted/30 text-muted-foreground/50'}"
				>
					<div class="flex justify-end">
						<span
							class="flex h-5 w-5 items-center justify-center rounded-full text-xs {isToday
								? 'bg-primary font-semibold text-primary-foreground'
								: ''}"
						>
							{day.date.getDate()}
						</span>
					</div>
					<div class="mt-0.5 space-y-0.5">
						{#each daySessions.slice(0, 2) as session (session.id)}
							<div
								class="truncate rounded px-1 py-0.5 text-[10px] leading-tight {session.status ===
								'ended'
									? 'bg-muted text-muted-foreground'
									: 'bg-primary/15 text-primary'}"
								title={session.nom}
							>
								{session.nom}
							</div>
						{/each}
						{#if daySessions.length > 2}
							<div class="px-1 text-[10px] text-muted-foreground">
								+{daySessions.length - 2}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/each}
	</div>
</div>
