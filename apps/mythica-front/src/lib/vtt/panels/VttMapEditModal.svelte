<script lang="ts">
	import { campaignService } from "$lib/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as NativeSelect from "$lib/components/ui/native-select";

	let {
		map,
		campaignId,
		open,
		onOpenChange,
		onSuccess,
	}: {
		map: Record<string, unknown> | null;
		campaignId: string;
		open: boolean;
		onOpenChange: (o: boolean) => void;
		onSuccess: () => void;
	} = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	let editNom = $state("");
	let editGridType = $state<"square" | "hex" | "free">("square");
	let editGridSize = $state(100);
	let editWidthPx = $state(2000);
	let editHeightPx = $state(2000);
	let editGridOffsetX = $state(0);
	let editGridOffsetY = $state(0);
	let editGridColor = $state("#ffffff33");
	let editGridOpacity = $state(0.3);

	let fileInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (open && map) {
			editNom = map.nom;
			editGridType = map.gridType;
			editGridSize = map.gridSize;
			editWidthPx = map.widthPx;
			editHeightPx = map.heightPx;
			editGridOffsetX = map.gridOffsetX;
			editGridOffsetY = map.gridOffsetY;
			editGridColor = map.gridColor;
			editGridOpacity = map.gridOpacity;
			error = null;
		}
	});

	function onFileChange() {
		const file = fileInput?.files?.[0];
		if (!file) return;

		const img = new Image();
		img.onload = () => {
			editWidthPx = img.width;
			editHeightPx = img.height;
		};
		img.src = URL.createObjectURL(file);
	}

	async function saveChanges() {
		busy = true;
		error = null;
		try {
			await campaignService.updateMap(campaignId, map.id, {
				nom: editNom,
				gridType: editGridType,
				gridSize: editGridSize,
				widthPx: editWidthPx,
				heightPx: editHeightPx,
				gridOffsetX: editGridOffsetX,
				gridOffsetY: editGridOffsetY,
				gridColor: editGridColor,
				gridOpacity: editGridOpacity,
			});

			// If a file was selected, upload it
			if (fileInput?.files?.length) {
				const file = fileInput.files[0];
				await campaignService.uploadMapFile(campaignId, map.id, file);
			}

			onSuccess();
			onOpenChange(false);
		} catch (err: unknown) {
			error =
				err instanceof Error ? err.message : "Erreur lors de la sauvegarde.";
		} finally {
			busy = false;
		}
	}

	async function confirmDeleteMap() {
		busy = true;
		error = null;
		try {
			await campaignService.deleteMap(campaignId, map!.id);
			onSuccess();
			onOpenChange(false);
			showDeleteConfirm = false;
		} catch (err: unknown) {
			error =
				err instanceof Error ? err.message : "Erreur lors de la suppression.";
		} finally {
			busy = false;
		}
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Paramètres de la Map</Dialog.Title>
			<Dialog.Description>
				Modifiez les propriétés de la map ou chargez une nouvelle image de fond.
			</Dialog.Description>
		</Dialog.Header>

		{#if error}
			<p class="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</p>
		{/if}

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="map-name">Nom</Label>
				<Input id="map-name" bind:value={editNom} disabled={busy} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="map-type">Type de grille</Label>
					<NativeSelect.Root>
						<NativeSelect.Select bind:value={editGridType} disabled={busy}>
							<NativeSelect.Option value="square">Carrée</NativeSelect.Option>
							<NativeSelect.Option value="hex">Hexagonale</NativeSelect.Option>
							<NativeSelect.Option value="free">Sans grille</NativeSelect.Option
							>
						</NativeSelect.Select>
					</NativeSelect.Root>
				</div>
				<div class="grid gap-2">
					<Label for="map-size">Taille des cases (px)</Label>
					<Input
						id="map-size"
						type="number"
						bind:value={editGridSize}
						disabled={busy}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="map-width">Largeur (px)</Label>
					<Input
						id="map-width"
						type="number"
						bind:value={editWidthPx}
						disabled={busy}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="map-height">Hauteur (px)</Label>
					<Input
						id="map-height"
						type="number"
						bind:value={editHeightPx}
						disabled={busy}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="map-off-x">Offset X (px)</Label>
					<Input
						id="map-off-x"
						type="number"
						bind:value={editGridOffsetX}
						disabled={busy}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="map-off-y">Offset Y (px)</Label>
					<Input
						id="map-off-y"
						type="number"
						bind:value={editGridOffsetY}
						disabled={busy}
					/>
				</div>
			</div>

			<div class="grid gap-2">
				<Label for="map-file">Image de fond</Label>
				<Input
					id="map-file"
					type="file"
					accept="image/png, image/jpeg, image/webp"
					bind:ref={fileInput}
					onchange={onFileChange}
					disabled={busy}
				/>
				<p class="text-xs text-muted-foreground">
					L'image actuelle sera remplacée. Laissez vide pour la conserver.
				</p>
			</div>
		</div>

		<Dialog.Footer class="sm:justify-between">
			<Button
				variant="destructive"
				onclick={() => (showDeleteConfirm = true)}
				disabled={busy}
			>
				Supprimer
			</Button>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					onclick={() => onOpenChange(false)}
					disabled={busy}
				>
					Annuler
				</Button>
				<Button onclick={saveChanges} disabled={busy || !editNom.trim()}>
					Enregistrer
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={showDeleteConfirm}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Êtes-vous sûr ?</AlertDialog.Title>
			<AlertDialog.Description>
				Cette action est irréversible. Cela supprimera définitivement la map "{map?.nom}"
				et tous les éléments associés.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={busy}>Annuler</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={confirmDeleteMap}
				disabled={busy}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Continuer
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
