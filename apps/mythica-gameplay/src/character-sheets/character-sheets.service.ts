import type { PrismaClient } from "../../generated/prisma/client";
import { newId } from "../lib/id";

type DbClient = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Crée un snapshot indépendant d'une fiche existante pour un nouveau propriétaire.
 * Copie la fiche source + ses valeurs + ses sélections.
 * Retourne l'id du nouveau CharacterSheet.
 *
 * Doit être appelé à l'intérieur d'une transaction externe afin de garantir
 * l'atomicité avec la création du lien CampaignCharacterSheet.
 */
export async function duplicateCharacterSheet(
	sourceId: string,
	newOwnerId: string,
	db: DbClient,
): Promise<string> {
	const source = await db.characterSheet.findUniqueOrThrow({
		where: { id: sourceId },
		include: { values: true, selections: true },
	});

	const newSheetId = newId();

	await db.characterSheet.create({
		data: {
			id: newSheetId,
			userId: newOwnerId,
			gameSystemId: source.gameSystemId,
			name: source.name,
			avatarFileId: source.avatarFileId,
			gold: source.gold,
			abilityMethod: source.abilityMethod,
			visibility: "private",
		},
	});

	if (source.values.length > 0) {
		await db.characterSheetValue.createMany({
			data: source.values.map((v) => ({
				id: newId(),
				characterSheetId: newSheetId,
				propertyId: v.propertyId,
				value: v.value,
			})),
		});
	}

	if (source.selections.length > 0) {
		const selectionIdMap = new Map<string, string>();
		for (const s of source.selections) {
			selectionIdMap.set(s.id, newId());
		}

		await db.characterSheetSelection.createMany({
			data: source.selections.map((s) => ({
				id: selectionIdMap.get(s.id)!,
				characterSheetId: newSheetId,
				collectionKey: s.collectionKey,
				contentId: s.contentId,
				level: s.level,
				isPrimary: s.isPrimary,
				parentSelectionId: s.parentSelectionId
					? (selectionIdMap.get(s.parentSelectionId) ?? null)
					: null,
				qty: s.qty,
				extra: s.extra ?? undefined,
			})),
		});
	}

	return newSheetId;
}
