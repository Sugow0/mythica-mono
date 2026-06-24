<script lang="ts">
	import SendIcon from "@lucide/svelte/icons/send";
	import { onDestroy, onMount } from "svelte";
	import { campaignService } from "$lib/index.js";

	let {
		sessionId: _sessionId,
		campaignId,
	}: { sessionId: string; campaignId: string } = $props();

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

	onMount(() => {
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
					messages = [...messages.slice(-99), msg];
					scrollBottom();
				}
			} catch {
				/* ignorer */
			}
		};
	});

	onDestroy(() => eventSource?.close());
</script>

<div
	class="fixed bottom-4 right-4 z-50 flex w-72 flex-col rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
>
	<button
		onclick={() => {
			isOpen = !isOpen;
		}}
		class="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white"
	>
		<span>Chat</span>
		<span class="text-slate-600">{isOpen ? "▾" : "▸"}</span>
	</button>
	{#if isOpen}
		<ul
			bind:this={listEl}
			class="flex max-h-48 flex-col gap-1 overflow-y-auto p-2"
		>
			{#each messages as msg (msg.id)}
				<li class="text-xs">
					<span class="font-medium text-red-400">{msg.user?.pseudo ?? "?"}</span
					>
					<span class="ml-1 text-slate-300">{msg.content}</span>
				</li>
			{/each}
		</ul>
		<div class="flex gap-1 border-t border-slate-700 p-2">
			<input
				bind:value={input}
				onkeydown={onKey}
				placeholder="Message…"
				class="flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-600"
			/>
			<button
				onclick={send}
				class="rounded bg-red-600 p-1.5 text-white hover:bg-red-700"
			>
				<SendIcon class="h-3 w-3" />
			</button>
		</div>
	{/if}
</div>
