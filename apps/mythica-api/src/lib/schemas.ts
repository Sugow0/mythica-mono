/** Schémas TypeBox communs pour validation et génération OpenAPI */
import { type Static, t } from "elysia";

// ==================== CONSTANTES RÉUTILISABLES ====================

export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 20,
	MAX_LIMIT: 100,
} as const;

export const PASSWORD_MIN_LENGTH = 6;

// ==================== SCHÉMAS DE BASE ====================

/** Schéma email avec validation basique */
export const Email = t.String({
	format: "email",
	description: "Adresse email valide",
});

/** Schéma pagination pour les query params */
export const PaginationQuery = t.Object({
	page: t.Optional(
		t.Numeric({
			minimum: 1,
			default: PAGINATION.DEFAULT_PAGE,
			description: "Numéro de page",
		}),
	),
	limit: t.Optional(
		t.Numeric({
			minimum: 1,
			maximum: PAGINATION.MAX_LIMIT,
			default: PAGINATION.DEFAULT_LIMIT,
			description: "Nombre d'éléments par page",
		}),
	),
});

export type PaginationQueryType = Static<typeof PaginationQuery>;

/** Schéma de pagination pour les réponses */
export const PaginationMeta = t.Object({
	page: t.Number({ description: "Page actuelle" }),
	limit: t.Number({ description: "Limite par page" }),
	total: t.Number({ description: "Nombre total d'éléments" }),
	totalPages: t.Number({ description: "Nombre total de pages" }),
});

export type PaginationMetaType = Static<typeof PaginationMeta>;

// ==================== ENUMS ====================

export const RoleUserEnum = t.Union(
	[t.Literal("ADMIN"), t.Literal("SUPPORT"), t.Literal("USER")],
	{ description: "Rôle global de l'utilisateur" },
);

// ==================== SCHÉMAS DE RÉPONSE ====================

/** Réponse d'erreur standard */
export const ErrorResponse = t.Object({
	success: t.Literal(false),
	error: t.String({ description: "Message d'erreur" }),
});

export type ErrorResponseType = Static<typeof ErrorResponse>;

/** Réponse de succès avec message */
export const SuccessMessageResponse = t.Object({
	success: t.Literal(true),
	message: t.String({ description: "Message de confirmation" }),
});

export type SuccessMessageResponseType = Static<typeof SuccessMessageResponse>;

/** Factory pour réponse succès avec ID */
export const SuccessWithId = <K extends string>(
	idName: K,
	description: string,
) =>
	t.Object({
		success: t.Literal(true),
		[idName]: t.String({ description }),
	} as Record<"success", ReturnType<typeof t.Literal>> &
		Record<K, ReturnType<typeof t.String>>);

// ==================== SCHÉMAS D'ENTITÉS PUBLIQUES ====================

/** Utilisateur minimal (dans listes) */
export const MinimalUserSchema = t.Object({
	id: t.String(),
	pseudo: t.String(),
	avatar: t.Nullable(t.String()),
});

export type MinimalUserType = Static<typeof MinimalUserSchema>;

/** Utilisateur public (détail) */
export const PublicUserSchema = t.Object({
	id: t.String(),
	firstName: t.String(),
	lastName: t.String(),
	pseudo: t.String(),
	avatar: t.Nullable(t.String()),
	emailVerified: t.Boolean(),
	createdAt: t.Date(),
});

export type PublicUserType = Static<typeof PublicUserSchema>;

/** Utilisateur authentifié (GET /me) — champs publics + email + role */
export const MeUserSchema = t.Object({
	id: t.String(),
	firstName: t.String(),
	lastName: t.String(),
	pseudo: t.String(),
	avatar: t.Nullable(t.String()),
	bio: t.Nullable(t.String()),
	emailVerified: t.Boolean(),
	createdAt: t.Date(),
	email: t.String({
		format: "email",
		description: "Adresse email de l'utilisateur connecté",
	}),
	role: RoleUserEnum,
});

export type MeUserType = Static<typeof MeUserSchema>;

// ==================== RÉPONSES PAGINÉES ====================

/** Factory pour créer une réponse paginée */
export const PaginatedResponse = <T extends ReturnType<typeof t.Object>>(
	itemSchema: T,
	itemsName: string,
) =>
	t.Object({
		success: t.Literal(true),
		[itemsName]: t.Array(itemSchema),
		pagination: PaginationMeta,
	});

/** Réponse liste d'utilisateurs paginée */
export const UserListResponse = t.Object({
	success: t.Literal(true),
	users: t.Array(PublicUserSchema),
	pagination: PaginationMeta,
});

export type UserListResponseType = Static<typeof UserListResponse>;
