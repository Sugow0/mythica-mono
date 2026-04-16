import type { Prisma } from "../../../generated/prisma/client";

/**
 * Select Prisma pour les champs publics d'un utilisateur (liste, détail par id).
 * Ne pas exposer email, password, twoFactorSecret, etc.
 */
export const publicUserSelect = {
	id: true,
	firstName: true,
	lastName: true,
	pseudo: true,
	avatar: true,
	emailVerified: true,
	createdAt: true,
} as const;

export type PublicUser = Prisma.UserGetPayload<{
	select: typeof publicUserSelect;
}>;
