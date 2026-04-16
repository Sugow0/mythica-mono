import { prisma } from "../../../../lib/prisma";
import { type PublicUser, publicUserSelect } from "../../public-user.select";
import type { GetUsersQuery } from "./get-users.dto";

export type GetUsersResult = {
	success: true;
	users: PublicUser[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

/**
 * Query : liste des utilisateurs avec pagination.
 */
export async function getUsersHandler(
	query: GetUsersQuery,
): Promise<GetUsersResult> {
	const { page, limit } = query;
	const skip = (page - 1) * limit;

	const [users, total] = await Promise.all([
		prisma.users.findMany({
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: publicUserSelect,
		}),
		prisma.users.count(),
	]);

	return {
		success: true,
		users,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
}
