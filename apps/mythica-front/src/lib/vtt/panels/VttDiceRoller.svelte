<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";

	import { untrack } from "svelte";

	type VisualRoll = {
		id: string;
		value: number;
		x: number;
		y: number;
		rotation: number;
	};

	let visualRolls = $state<VisualRoll[]>([]);
	let processedCount = 0;

	$effect(() => {
		const newRolls = vttState.diceRolls.slice(processedCount);
		if (newRolls.length > 0) {
			processedCount = vttState.diceRolls.length;
			newRolls.forEach((r) => {
				r.results.forEach((val) => {
					const id = Math.random().toString(36).substring(2);
					const startX = window.innerWidth / 2 + (Math.random() * 100 - 50);
					const startY = window.innerHeight / 2 + (Math.random() * 100 - 50);

					untrack(() => {
						visualRolls = [
							...visualRolls,
							{
								id,
								value: val,
								x: startX,
								y: startY,
								rotation: Math.random() * 360 + 720,
							},
						];
					});

					// Remove after animation
					setTimeout(() => {
						untrack(() => {
							visualRolls = visualRolls.filter((v) => v.id !== id);
						});
					}, 2000);
				});
			});
		}
	});
</script>

<div class="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
	{#each visualRolls as roll (roll.id)}
		<div
			class="absolute flex h-16 w-16 items-center justify-center rounded-xl border-2 border-red-500 bg-red-950 text-2xl font-bold text-white shadow-lg transition-all duration-1000 ease-out"
			style="
				left: {roll.x}px; 
				top: {roll.y}px; 
				transform: translate(-50%, -50%) rotate({roll.rotation}deg);
				animation: fadeOut 2s forwards;
			"
		>
			{roll.value}
		</div>
	{/each}
</div>

<style>
	@keyframes fadeOut {
		0% {
			opacity: 0;
			transform: scale(0.5) translate(-50%, -50%) rotate(0deg);
		}
		10% {
			opacity: 1;
			transform: scale(1.2) translate(-50%, -50%) rotate(360deg);
		}
		20% {
			transform: scale(1) translate(-50%, -50%) rotate(720deg);
		}
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
