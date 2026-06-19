<script lang="ts">
	import ImageIcon from "@lucide/svelte/icons/image";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";

	let {
		currentUrl = null,
		fallback = "",
		uploading = false,
		size = "md",
		onUpload,
	}: {
		/** URL du token actuel (null si aucun). */
		currentUrl?: string | null;
		/** Initiale affichée à défaut d'image. */
		fallback?: string;
		/** Upload en cours (désactive les actions). */
		uploading?: boolean;
		/** Taille de l'aperçu rond. */
		size?: "sm" | "md" | "lg";
		/** Appelé avec le token recadré (PNG carré, coins transparents). */
		onUpload: (blob: Blob) => void | Promise<void>;
	} = $props();

	const PREVIEW_PX: Record<string, string> = {
		sm: "h-14 w-14",
		md: "h-24 w-24",
		lg: "h-32 w-32",
	};

	/** Zone d'édition carrée (px). */
	const VIEW = 288;
	/** Résolution du token exporté (px). */
	const OUTPUT = 512;

	let open = $state(false);
	let image = $state<HTMLImageElement | null>(null);
	let zoom = $state(1);
	let offset = $state({ x: 0, y: 0 });
	let canvas = $state<HTMLCanvasElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let dragging = false;
	let last = { x: 0, y: 0 };

	/** Échelle « cover » : l'image remplit toujours la zone carrée. */
	const baseScale = $derived(
		image ? Math.max(VIEW / image.naturalWidth, VIEW / image.naturalHeight) : 1
	);
	const drawW = $derived(image ? image.naturalWidth * baseScale * zoom : 0);
	const drawH = $derived(image ? image.naturalHeight * baseScale * zoom : 0);

	/** Borne l'offset pour que l'image couvre la zone (pas de vide). */
	function clamp(o: { x: number; y: number }) {
		return {
			x: Math.min(0, Math.max(VIEW - drawW, o.x)),
			y: Math.min(0, Math.max(VIEW - drawH, o.y)),
		};
	}

	function pickFile() {
		fileInput?.click();
	}

	function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const img = new Image();
		img.onload = () => {
			image = img;
			zoom = 1;
			prevZoom = 1;
			offset = { x: 0, y: 0 };
			open = true;
		};
		img.src = URL.createObjectURL(file);
		// Réinitialise pour permettre de re-sélectionner le même fichier.
		(e.currentTarget as HTMLInputElement).value = "";
	}

	function redraw() {
		const ctx = canvas?.getContext("2d");
		if (!ctx || !image) return;
		ctx.clearRect(0, 0, VIEW, VIEW);
		const o = clamp(offset);
		ctx.drawImage(image, o.x, o.y, drawW, drawH);
	}

	// Recentre l'image autour du centre de la zone lorsqu'on zoome.
	let prevZoom = 1;
	function onZoom(next: number) {
		const factor = next / prevZoom;
		const cx = VIEW / 2;
		const cy = VIEW / 2;
		offset = clamp({
			x: cx - (cx - offset.x) * factor,
			y: cy - (cy - offset.y) * factor,
		});
		prevZoom = next;
		zoom = next;
	}

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		last = { x: e.clientX, y: e.clientY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		offset = clamp({
			x: offset.x + (e.clientX - last.x),
			y: offset.y + (e.clientY - last.y),
		});
		last = { x: e.clientX, y: e.clientY };
	}
	function onPointerUp() {
		dragging = false;
	}

	// Redessine à chaque changement d'image, de zoom ou de position.
	$effect(() => {
		// Dépendances explicites.
		void offset;
		void zoom;
		void image;
		if (open) redraw();
	});

	async function save() {
		if (!image) return;
		const out = document.createElement("canvas");
		out.width = OUTPUT;
		out.height = OUTPUT;
		const ctx = out.getContext("2d");
		if (!ctx) return;
		const ratio = OUTPUT / VIEW;
		const o = clamp(offset);
		// Découpe circulaire (coins transparents) pour un vrai token.
		ctx.save();
		ctx.beginPath();
		ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
		ctx.clip();
		ctx.drawImage(
			image,
			o.x * ratio,
			o.y * ratio,
			drawW * ratio,
			drawH * ratio
		);
		ctx.restore();
		const blob = await new Promise<Blob | null>((resolve) =>
			out.toBlob(resolve, "image/png")
		);
		if (!blob) return;
		await onUpload(blob);
		open = false;
		image = null;
	}
</script>

<input
	bind:this={fileInput}
	type="file"
	accept="image/png,image/jpeg,image/webp"
	class="hidden"
	onchange={onFile}
/>

<div class="flex flex-col items-center gap-2">
	<button
		type="button"
		onclick={pickFile}
		disabled={uploading}
		aria-label={currentUrl ? "Changer le token" : "Ajouter un token"}
		class="group border-primary/40 bg-muted relative grid {PREVIEW_PX[
			size
		]} place-items-center overflow-hidden rounded-full border-2 shadow-sm transition-colors hover:border-primary disabled:opacity-60"
	>
		{#if currentUrl}
			<img
				src={currentUrl}
				alt="Token du personnage"
				class="h-full w-full object-cover"
			/>
		{:else}
			<span class="text-primary font-display text-2xl font-bold">
				{fallback || "?"}
			</span>
		{/if}
		<span
			class="bg-foreground/55 absolute inset-0 grid place-items-center text-white opacity-0 transition-opacity group-hover:opacity-100"
		>
			{#if uploading}
				<LoaderIcon class="h-5 w-5 animate-spin" />
			{:else}
				<ImageIcon class="h-5 w-5" />
			{/if}
		</span>
	</button>
</div>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Recadrer le token</Dialog.Title>
			<Dialog.Description>
				Glissez l'image pour la positionner, ajustez le zoom. Le token est rogné
				en cercle.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col items-center gap-4">
			<div
				class="relative touch-none overflow-hidden rounded-lg"
				style="width: {VIEW}px; height: {VIEW}px;"
				role="application"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
			>
				<canvas
					bind:this={canvas}
					width={VIEW}
					height={VIEW}
					class="cursor-move bg-muted"
				></canvas>
				<!-- Masque : assombrit hors du cercle + anneau crimson. -->
				<div
					class="border-primary pointer-events-none absolute inset-0 m-auto rounded-full border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
				></div>
			</div>

			<label class="flex w-full items-center gap-3 px-1">
				<span class="text-muted-foreground text-xs">Zoom</span>
				<input
					type="range"
					min="1"
					max="3"
					step="0.01"
					value={zoom}
					oninput={(e) => onZoom(Number(e.currentTarget.value))}
					class="accent-primary h-1.5 flex-1 cursor-pointer"
					aria-label="Zoom du token"
				/>
			</label>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Annuler</Button>
			<Button onclick={save} disabled={uploading}>
				{#if uploading}
					<LoaderIcon class="h-4 w-4 animate-spin" />
				{:else}
					<UploadIcon class="h-4 w-4" />
				{/if}
				Enregistrer le token
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
