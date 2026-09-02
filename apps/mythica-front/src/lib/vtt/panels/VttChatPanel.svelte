<script lang="ts">
	import SendIcon from "@lucide/svelte/icons/send";
	import MessageSquareIcon from "@lucide/svelte/icons/message-square";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
	import { onDestroy, onMount } from "svelte";
	import { campaignService } from "$lib/index.js";

	let {
		sessionId: _sessionId,
		campaignId,
		currentUserId,
	}: {
		sessionId: string;
		campaignId: string;
		currentUserId?: string;
	} = $props();

	type Message = {
		id: string;
		userId: string;
		content: string;
		createdAt: string;
		user: { pseudo: string | null };
	};
	let messages = $state<Message[]>([]);
	let input = $state("");
	let listEl = $state<HTMLElement | undefined>(undefined);
	let isOpen = $state(true);
	let eventSource: EventSource | null = null;

	function scrollBottom() {
		setTimeout(() => {
			listEl?.scrollTo({ top: listEl.scrollHeight, behavior: "smooth" });
		}, 50);
	}

	async function send() {
		if (!input.trim()) return;
		try {
			await campaignService.postMessage(campaignId, input.trim());
			input = "";
		} catch {
			/* ignorer */
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function parseDiceRoll(content: string) {
		try {
			const colonIndex = content.indexOf(":");
			const eqIndex = content.lastIndexOf("=");
			const startTotal = content.indexOf("**");
			const endTotal = content.lastIndexOf("**");

			if (colonIndex > -1 && eqIndex > -1 && startTotal > -1 && endTotal > -1) {
				const title = content.substring(2, colonIndex).trim(); // skip 🎲
				const details = content.substring(colonIndex + 1, eqIndex).trim();
				const total = content.substring(startTotal + 2, endTotal).trim();
				const extra = content.substring(endTotal + 2).trim();

				return { title, details, total, extra };
			}
		} catch (e) {}
		return null;
	}

	onMount(async () => {
		try {
			const res = await campaignService.getMessages(campaignId);
			if (res?.items) {
				messages = res.items as Message[];
				scrollBottom();
			}
		} catch {
			// ignore
		}

		eventSource = new EventSource(
			campaignService.messagesStreamUrl(campaignId),
			{
				withCredentials: true,
			}
		);
		eventSource.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.content) {
					// Check if message already exists
					if (!messages.some((m) => m.id === msg.id)) {
						messages = [...messages.slice(-99), msg];
						scrollBottom();
					}
				}
			} catch {
				/* ignorer */
			}
		};
	});

	onDestroy(() => eventSource?.close());
</script>

<div
	class="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-background/70 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 ease-out {isOpen
		? 'h-[66vh] w-80'
		: 'h-12 w-48'}"
>
	<button
		onclick={() => {
			isOpen = !isOpen;
			if (isOpen) scrollBottom();
		}}
		class="group flex h-12 shrink-0 items-center justify-between border-b border-border/30 px-4 transition-colors hover:bg-secondary/40"
	>
		<div class="flex items-center gap-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				<MessageSquareIcon class="h-4 w-4" />
			</div>
			<span class="text-sm font-medium tracking-tight text-foreground"
				>Chat & Historique</span
			>
		</div>
		<div
			class="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-secondary group-hover:text-foreground"
		>
			{#if isOpen}
				<ChevronDownIcon class="h-4 w-4" />
			{:else}
				<ChevronUpIcon class="h-4 w-4" />
			{/if}
		</div>
	</button>

	{#if isOpen}
		<ul
			bind:this={listEl}
			class="flex flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 scrollbar-none"
		>
			{#each messages as msg (msg.id)}
				{@const isDice = msg.content.includes("🎲")}

				<li
					class="flex w-full flex-col rounded-xl border border-border/50 bg-background/60 p-3 shadow-sm transition-colors hover:bg-background/80"
				>
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-xs font-semibold text-foreground"
							>{msg.user?.pseudo ?? "Inconnu"}</span
						>
						<span class="text-[10px] text-muted-foreground"
							>{new Date(msg.createdAt).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}</span
						>
					</div>

					<div class="text-[13px] leading-relaxed text-foreground/90">
						{#if isDice}
							{@const parsed = parseDiceRoll(msg.content)}
							{#if parsed}
								<div
									class="mt-1 flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-primary/5 shadow-inner"
								>
									<div
										class="flex flex-col items-center justify-center p-3 text-center"
									>
										<span
											class="text-[10px] font-semibold uppercase tracking-wider text-primary/70"
											>{parsed.title}
											<span class="text-muted-foreground/80 normal-case"
												>{parsed.extra}</span
											></span
										>
										<span
											class="mt-1 text-4xl font-bold tracking-tighter text-primary"
											>{parsed.total}</span
										>
									</div>
									<details class="group/dice border-t border-primary/10">
										<summary
											class="list-none flex cursor-pointer items-center justify-center bg-primary/10 py-2 text-[10px] font-medium text-primary hover:bg-primary/20 [&::-webkit-details-marker]:hidden"
										>
											<span class="mr-1 uppercase tracking-widest">Détails</span
											>
											<ChevronDownIcon
												class="h-3 w-3 transition-transform group-open/dice:rotate-180"
											/>
										</summary>
										<div
											class="border-t border-primary/10 bg-primary/5 px-3 py-2.5 text-center text-xs font-mono text-primary/80"
										>
											{parsed.details}
										</div>
									</details>
								</div>
							{:else}
								<div
									class="mt-1 flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 py-2.5 px-3 text-center font-medium text-primary shadow-inner"
								>
									{msg.content}
								</div>
							{/if}
						{:else}
							{msg.content}
						{/if}
					</div>
				</li>
			{/each}
			{#if messages.length === 0}
				<div
					class="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground"
				>
					<MessageSquareIcon class="h-8 w-8 opacity-20" />
					<p class="text-sm">Le journal est vide.</p>
				</div>
			{/if}
		</ul>
		<div
			class="shrink-0 border-t border-border/30 bg-background/50 p-3 backdrop-blur-md"
		>
			<div
				class="flex items-end gap-2 rounded-xl border border-border/40 bg-secondary/30 p-1 pl-3 pr-1 shadow-inner transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50"
			>
				<textarea
					bind:value={input}
					onkeydown={onKey}
					placeholder="Votre message…"
					rows="2"
					class="w-full resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none scrollbar-none"
				></textarea>
				<button
					onclick={send}
					disabled={!input.trim()}
					class="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
				>
					<SendIcon class="h-4 w-4" />
				</button>
			</div>
		</div>
	{/if}
</div>
