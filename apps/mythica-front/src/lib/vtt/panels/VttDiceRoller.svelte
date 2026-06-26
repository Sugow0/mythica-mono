<script lang="ts">
	import { vttState } from "$lib/vtt/vtt.svelte";
	import { untrack, onMount } from "svelte";

	type VisualRoll = {
		id: string;
		value: number;
		x: number;
		y: number;
		rotation: number;
	};

	let visualRolls = $state<VisualRoll[]>([]);
	let processedCount = 0;

	let diceBoxContainer: HTMLElement;
	let diceBoxInstance: any = null;
	let diceBoxReady = false;

	onMount(() => {
		let isMounted = true;
		import("@3d-dice/dice-box").then((mod) => {
			if (!isMounted) return;
			const DiceBox = mod.default;
			diceBoxInstance = new DiceBox("#dice-box-container", {
				assetPath: "/assets/dice-box/",
				theme: "default",
				themeColor: "#991b1b",
				scale: 6,
				spinForce: 6,
				throwForce: 6,
				startingHeight: 8,
			});

			diceBoxInstance
				.init()
				.then(() => {
					console.log("3D Dice Box initialized successfully!");
					if (isMounted) diceBoxReady = true;
				})
				.catch((err: any) => {
					console.error("Failed to initialize 3D Dice Box:", err);
				});
		});

		return () => {
			isMounted = false;
			if (diceBoxInstance) {
				const container = document.getElementById("dice-box-container");
				if (container) container.innerHTML = "";
			}
		};
	});

	$effect(() => {
		const newRolls = vttState.diceRolls.slice(processedCount);
		if (newRolls.length > 0) {
			processedCount = vttState.diceRolls.length;

			newRolls.forEach((r) => {
				if (vttState.use3DDice && diceBoxReady && diceBoxInstance) {
					// Extract only valid dice strings (e.g. "1d20", "2d6") and join them
					const matches = r.formula.match(/\d*[dD]\d+/g);
					if (matches && matches.length > 0) {
						const cleanFormula = matches.join(" + ");
						console.log("Rolling 3D dice:", cleanFormula);
						diceBoxInstance.roll(cleanFormula).catch((err: any) => {
							console.error("Error rolling 3D dice:", err);
						});
					}
				} else if (!vttState.use3DDice) {
					// Fallback to 2D
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

						setTimeout(() => {
							untrack(() => {
								visualRolls = visualRolls.filter((v) => v.id !== id);
							});
						}, 2000);
					});
				}
			});
		}
	});
</script>

<div
	id="dice-box-container"
	class="pointer-events-none fixed inset-0 z-[100] w-full h-full overflow-hidden transition-opacity duration-300"
	class:opacity-0={!vttState.use3DDice}
></div>

<div
	class="pointer-events-none fixed inset-0 z-[101] overflow-hidden transition-opacity duration-300"
	class:opacity-0={vttState.use3DDice}
>
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
