<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { campaignService } from "$lib/index.js";

	let {
		sessionId: _sessionId,
		campaignId,
	}: { sessionId: string; campaignId: string } = $props();

	type ChatMessage = {
		id: string;
		content: string;
		userId: string;
		createdAt: string;
	};

	let messages = $state<ChatMessage[]>([]);
	let inputValue = $state("");
	let eventSource: EventSource | null = null;

	function connectChat() {
		if (!campaignId) return;
		eventSource?.close();
		eventSource = new EventSource(
			campaignService.messagesStreamUrl(campaignId),
			{
				withCredentials: true,
			}
		);
		eventSource.onmessage = (event: MessageEvent<string>) => {
			try {
				const msg = JSON.parse(event.data) as ChatMessage;
				messages = [...messages.slice(-99), msg];
			} catch {
				// ignore malformed events
			}
		};
	}

	async function send() {
		const content = inputValue.trim();
		if (!content || !campaignId) return;
		inputValue = "";
		try {
			await campaignService.postMessage(campaignId, content);
		} catch {
			// ignore send errors
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	onMount(() => {
		connectChat();
	});

	onDestroy(() => {
		eventSource?.close();
	});
</script>

<div
	class="absolute bottom-2 right-2 w-64 rounded-lg bg-slate-900/90 border border-slate-700 flex flex-col z-10"
	style="max-height: 300px"
>
	<div
		class="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-2 border-b border-slate-700"
	>
		Chat
	</div>
	<div class="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
		{#each messages as msg (msg.id)}
			<div class="text-xs text-slate-300">
				<span class="text-slate-500">{msg.userId.slice(0, 6)}:</span>
				{msg.content}
			</div>
		{/each}
	</div>
	<div class="border-t border-slate-700 p-2">
		<input
			type="text"
			bind:value={inputValue}
			onkeydown={handleKeydown}
			placeholder="Message…"
			class="w-full rounded bg-slate-800 text-xs text-slate-200 px-2 py-1 outline-none focus:ring-1 focus:ring-red-500"
		/>
	</div>
</div>
