import { prisma } from "../../../lib/prisma";
import type { GetGameSystemsQuery } from "./get-game-systems.dto";

export async function getGameSystemsHandler(query: GetGameSystemsQuery) {
	const { page, limit } = query;
	const skip = (page - 1) * limit;

	const [gameSystems, total] = await Promise.all([
		prisma.gameSystems.findMany({
			skip,
			take: limit,
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				description: true,
				gameSystemVersions: {
					select: {
						id: true,
						version: true,
						createdAt: true,
						updatedAt: true,
					},
					orderBy: { createdAt: "desc" },
				},
				createdAt: true,
				updatedAt: true,
			},
		}),
		prisma.gameSystems.count(),
	]);

	return {
		success: true as const,
		gameSystems,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}
