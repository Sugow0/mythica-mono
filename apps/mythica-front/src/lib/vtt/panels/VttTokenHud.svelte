<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";
	import type { SessionTokenDto } from "$lib/vtt/types";
	import HeartIcon from "@lucide/svelte/icons/heart";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import { fade, scale } from "svelte/transition";

	import * as Dialog from "$lib/components/ui/dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";

	let {
		token,
		onDelete,
		onUpdate,
	}: {
		token: SessionTokenDto;
		onDelete?: (tokenId: string) => void;
		onUpdate?: (updates: Partial<SessionTokenDto>) => void;
	} = $props();

	let dialogOpen = $state(false);
	let hpInput = $state("");
	let maxHpInput = $state("");

	function openHpDialog(e: MouseEvent) {
		e.stopPropagation();
		hpInput = "";
		maxHpInput = "";
		dialogOpen = true;
	}

	function submitHp() {
		let updates: Partial<SessionTokenDto> = {};

		if (maxHpInput) {
			const max = parseInt(maxHpInput, 10);
			if (!isNaN(max) && max > 0) updates.maxHp = max;
		}

		if (hpInput) {
			let newHp = token.hp ?? 0;
			if (hpInput.startsWith("+") || hpInput.startsWith("-")) {
				newHp += parseInt(hpInput, 10);
			} else {
				newHp = parseInt(hpInput, 10);
			}
			if (!isNaN(newHp)) {
				const maxHp = updates.maxHp ?? token.maxHp ?? newHp;
				updates.hp = Math.min(newHp, maxHp);
			}
		}

		if (Object.keys(updates).length > 0) {
			onUpdate?.(updates);
		}

		dialogOpen = false;
	}
</script>

<div
	class="flex flex-col items-center gap-2"
	in:scale={{ duration: 150, start: 0.9 }}
	out:fade={{ duration: 100 }}
>
	<!-- Actions primaires circulaires (HUD Radial / Floating) -->
	<div
		class="flex items-center gap-1.5 rounded-full bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md border border-slate-700/50"
	>
		<button
			onclick={openHpDialog}
			class="group relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
			title="Ajuster PV"
		>
			<HeartIcon class="h-4 w-4" />
		</button>

		<button
			class="group relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
			title="Statuts & Conditions"
		>
			<ShieldIcon class="h-4 w-4" />
		</button>

		<button
			class="group relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
			title="Paramètres du token"
		>
			<Settings2Icon class="h-4 w-4" />
		</button>

		{#if vttState.isGm}
			<div class="mx-1 h-6 w-px bg-slate-700"></div>
			<button
				onclick={(e) => {
					e.stopPropagation();
					if (confirm("Supprimer ce token ?")) {
						onDelete?.(token.id);
						vttState.setSelectedTokenId(null);
					}
				}}
				class="group relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-red-500/20 hover:text-red-400"
				title="Supprimer"
			>
				<Trash2Icon class="h-4 w-4" />
			</button>
		{/if}
	</div>

	<!-- Petit triangle pointant vers le bas pour lier le HUD au token -->
	<div
		class="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-900/90"
	></div>
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-[325px]">
		<Dialog.Header>
			<Dialog.Title>Ajuster les PV</Dialog.Title>
			<Dialog.Description>
				PV Actuels : {token.hp ?? "-"} / {token.maxHp ?? "-"}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-3 items-center gap-4">
				<Label for="hp" class="text-right">Ajuster PV</Label>
				<Input
					id="hp"
					bind:value={hpInput}
					placeholder="+5, -3, 15"
					class="col-span-2"
					onkeydown={(e) => e.key === "Enter" && submitHp()}
				/>
			</div>
			<div class="grid grid-cols-3 items-center gap-4">
				<Label for="maxHp" class="text-right">Max PV</Label>
				<Input
					id="maxHp"
					bind:value={maxHpInput}
					placeholder="Nouveau Max"
					class="col-span-2"
					onkeydown={(e) => e.key === "Enter" && submitHp()}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button onclick={submitHp}>Appliquer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
