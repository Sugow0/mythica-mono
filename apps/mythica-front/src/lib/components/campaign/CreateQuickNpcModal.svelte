<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { characterService } from "$lib/api/services/character-service";
	import { campaignCharacterSheetsService } from "$lib/api/services/campaign-character-sheets-service";

	let {
		open = $bindable(),
		campaignId,
		gameSystemId,
		onClose,
		onCreated,
	}: {
		open: boolean;
		campaignId: string;
		gameSystemId: string;
		onClose: () => void;
		onCreated: () => void;
	} = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

	let npcName = $state("");
	let npcHp = $state("10");
	let npcAc = $state("10");
	let npcType = $state("");
	let npcCr = $state("");

	async function createNpc() {
		if (!npcName.trim()) return;
		busy = true;
		error = null;

		try {
			// 1. Create the sheet
			const createRes = await characterService.createCharacterSheet({
				name: npcName.trim(),
				gameSystemId,
			});

			// 2. Fetch sheet properties to get their IDs
			const sheetDetail = await characterService.getCharacterSheetById(
				createRes.id
			);

			// Map commonly used keys in standard TTRPG systems
			const keyToId = new Map<string, string>();
			for (const p of sheetDetail.properties) {
				keyToId.set(p.key.toLowerCase(), p.propertyId);
			}

			// 3. Patch values
			const valuesToUpdate = [];

			const mapValue = (keyMatch: string[], value: string | number) => {
				for (const k of keyMatch) {
					if (keyToId.has(k)) {
						valuesToUpdate.push({ propertyId: keyToId.get(k)!, key: k, value });
						return;
					}
				}
			};

			mapValue(["hp_max", "hp", "pv", "pv_max", "hit_points"], Number(npcHp));
			mapValue(["ac", "ca", "armor_class", "classe_armure"], Number(npcAc));
			mapValue(["type", "creature_type"], npcType);
			mapValue(["cr", "challenge_rating", "fp"], npcCr);

			if (valuesToUpdate.length > 0) {
				await characterService.updateCharacterSheetValues(
					createRes.id,
					valuesToUpdate
				);
			}

			// 4. Import to pool
			await campaignCharacterSheetsService.importToPool(
				campaignId,
				createRes.id
			);

			onCreated();
			onClose();
		} catch (err: any) {
			error = err.message || "Failed to create quick NPC";
			console.error(err);
		} finally {
			busy = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(v) => {
		if (!v) onClose();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Créer un PNJ rapide</Dialog.Title>
			<Dialog.Description>
				Crée une fiche basique directement dans le pool MJ de la campagne.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			{#if error}
				<p class="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
			{/if}

			<div class="space-y-1.5">
				<Label for="npc-name">Nom</Label>
				<Input
					id="npc-name"
					bind:value={npcName}
					disabled={busy}
					placeholder="Ex: Gobelin"
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<Label for="npc-hp">Points de vie (PV)</Label>
					<Input id="npc-hp" type="number" bind:value={npcHp} disabled={busy} />
				</div>
				<div class="space-y-1.5">
					<Label for="npc-ac">Classe d'Armure (CA)</Label>
					<Input id="npc-ac" type="number" bind:value={npcAc} disabled={busy} />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<Label for="npc-type">Type</Label>
					<Input
						id="npc-type"
						bind:value={npcType}
						disabled={busy}
						placeholder="Ex: Humanoïde"
					/>
				</div>
				<div class="space-y-1.5">
					<Label for="npc-cr">CR / Niveau</Label>
					<Input
						id="npc-cr"
						bind:value={npcCr}
						disabled={busy}
						placeholder="Ex: 1/4"
					/>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose} disabled={busy}
				>Annuler</Button
			>
			<Button
				class="bg-red-600 hover:bg-red-700 text-white"
				onclick={createNpc}
				disabled={busy || !npcName.trim()}
			>
				{busy ? "Création..." : "Créer le PNJ"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
