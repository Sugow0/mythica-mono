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
	class="fixed bottom-4 right-4 z-50 flex w-80 flex-col overflow-hidden rounded-[1.5rem] border border-border/40 bg-background/70 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-300 ease-out"
>
	<button
		onclick={() => {
			isOpen = !isOpen;
		}}
		class="group flex items-center justify-between border-b border-border/30 px-4 py-3 transition-colors hover:bg-secondary/40"
	>
		<div class="flex items-center gap-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				<MessageSquareIcon class="h-4 w-4" />
			</div>
			<span class="text-sm font-medium tracking-tight text-foreground"
				>Chat</span
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
			class="flex max-h-72 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 scrollbar-none"
		>
			{#each messages as msg (msg.id)}
				{@const mine = msg.userId === currentUserId}
				{@const isDice = msg.content.includes("🎲")}

				<li class="flex w-full {mine ? 'justify-end' : 'justify-start'}">
					<div
						class="flex max-w-[85%] flex-col {mine
							? 'items-end'
							: 'items-start'}"
					>
						{#if !mine}
							<span
								class="mb-1 pl-2 text-[10px] font-medium text-muted-foreground"
								>{msg.user?.pseudo ?? "?"}</span
							>
						{/if}
						<div
							class="break-words rounded-2xl px-4 py-2 text-[13px] leading-relaxed shadow-sm {isDice
								? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20'
								: mine
									? 'bg-primary text-primary-foreground'
									: 'bg-secondary/60 text-foreground border border-border/20'}"
						>
							{#if isDice}
								<span class="font-medium">{msg.content}</span>
							{:else}
								{msg.content}
							{/if}
						</div>
					</div>
				</li>
			{/each}
			{#if messages.length === 0}
				<div
					class="flex h-32 flex-col items-center justify-center gap-2 text-center text-muted-foreground"
				>
					<MessageSquareIcon class="h-8 w-8 opacity-20" />
					<p class="text-sm">Le chat est vide.<br />Dites bonjour !</p>
				</div>
			{/if}
		</ul>
		<div
			class="border-t border-border/30 bg-background/50 p-3 backdrop-blur-md"
		>
			<div
				class="flex items-center gap-2 rounded-full border border-border/40 bg-secondary/30 p-1 pl-4 shadow-inner transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50"
			>
				<input
					bind:value={input}
					onkeydown={onKey}
					placeholder="Votre message…"
					class="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
				/>
				<button
					onclick={send}
					disabled={!input.trim()}
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
				>
					<SendIcon class="h-4 w-4" />
				</button>
			</div>
		</div>
	{/if}
</div>
