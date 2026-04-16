import { prisma } from "../../../lib/prisma";
import {
	type MinimalCharacter,
	minimalCharacterSelect,
} from "../../public-character.select";
import type { ListCharactersQuery } from "./list-characters.dto";

export type ListCharactersResult = {
	success: true;
	characters: MinimalCharacter[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

/**
 * Query : liste des fiches de personnage d'un utilisateur, avec filtres optionnels.
 */
export async function listCharactersHandler(
	userId: string,
	query: ListCharactersQuery,
): Promise<ListCharactersResult> {
	const { page = 1, limit = 20, campaignId, type, isActive } = query;
	const skip = (page - 1) * limit;

	const where = {
		userId,
		...(campaignId !== undefined && { campaignId }),
		...(type !== undefined && { type }),
		...(isActive !== undefined && { isActive }),
	};

	const [characters, total] = await Promise.all([
		prisma.characters.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: minimalCharacterSelect,
		}),
		prisma.characters.count({ where }),
	]);

	return {
		success: true,
		characters,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}
