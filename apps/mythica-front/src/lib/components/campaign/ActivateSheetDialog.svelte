<script lang="ts">
	import * as AlertDialog from "$lib/components/ui/alert-dialog";

	interface Props {
		open: boolean;
		sheetName: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { open = $bindable(), sheetName, onConfirm, onCancel }: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Activer « {sheetName} » ?</AlertDialog.Title>
			<AlertDialog.Description>
				Cette action est <strong>irréversible sans l'accord du MJ</strong>. Une
				fois activée, vous ne pourrez pas changer de personnage sans en faire la
				demande.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={onCancel}>Annuler</AlertDialog.Cancel>
			<AlertDialog.Action onclick={onConfirm}>Activer</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
