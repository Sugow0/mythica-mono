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

export const VisibilityEnum = t.Union(
	[t.Literal("PUBLIC"), t.Literal("PRIVATE")],
	{ description: "Visibilité de la campagne" },
);

export const CampaignStatusEnum = t.Union(
	[t.Literal("DRAFT"), t.Literal("ACTIVE"), t.Literal("ARCHIVED")],
	{ description: "Statut de la campagne" },
);

export const SessionStatusEnum = t.Union(
	[
		t.Literal("DRAFT"),
		t.Literal("SCHEDULED"),
		t.Literal("COMPLETED"),
		t.Literal("CANCELLED"),
	],
	{ description: "Statut de la session" },
);

export const MemberRoleEnum = t.Union(
	[t.Literal("PLAYER"), t.Literal("CO_GM")],
	{ description: "Rôle du membre" },
);

export const RoleUserEnum = t.Union(
	[t.Literal("ADMIN"), t.Literal("SUPPORT"), t.Literal("USER")],
	{ description: "Rôle global de l'utilisateur" },
);

export const CharacterTypeEnum = t.Union(
	[t.Literal("PLAYER"), t.Literal("NPC")],
	{ description: "Type de personnage" },
);

/** Données libres de la fiche (JSONB) */
export const CharacterDataSchema = t.Record(t.String(), t.Unknown(), {
	description: "Données libres de la fiche de personnage (JSONB)",
});

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
	emailVerified: t.Boolean(),
	createdAt: t.Date(),
	email: t.String({
		format: "email",
		description: "Adresse email de l'utilisateur connecté",
	}),
	role: RoleUserEnum,
});

export type MeUserType = Static<typeof MeUserSchema>;

/** Membre de campagne */
export const CampaignMemberSchema = t.Object({
	userId: t.String(),
	user: MinimalUserSchema,
});

/** Version d'un système de jeu */
export const GameSystemVersionSchema = t.Object({
	id: t.String(),
	version: t.String(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type GameSystemVersionType = Static<typeof GameSystemVersionSchema>;

/** Système de jeu */
export const GameSystemSchema = t.Object({
	id: t.String(),
	name: t.String(),
	description: t.Nullable(t.String()),
	gameSystemVersions: t.Array(GameSystemVersionSchema),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type GameSystemType = Static<typeof GameSystemSchema>;

/** Système de jeu minimal (pour les listes de campagnes) */
export const MinimalGameSystemSchema = t.Object({
	id: t.String(),
	name: t.String(),
});

export type MinimalGameSystemType = Static<typeof MinimalGameSystemSchema>;

/** Campagne dans les listes */
export const CampaignListItemSchema = t.Object({
	id: t.String(),
	name: t.String(),
	description: t.Nullable(t.String()),
	status: CampaignStatusEnum,
	visibility: VisibilityEnum,
	image: t.Nullable(t.String()),
	creatorId: t.String(),
	creator: MinimalUserSchema,
	gameSystem: MinimalGameSystemSchema,
	_count: t.Object({
		members: t.Number(),
	}),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type CampaignListItemType = Static<typeof CampaignListItemSchema>;

/** Campagne publique (détail complet) */
export const PublicCampaignSchema = t.Object({
	id: t.String(),
	name: t.String(),
	description: t.Nullable(t.String()),
	status: CampaignStatusEnum,
	visibility: VisibilityEnum,
	image: t.Nullable(t.String()),
	creatorId: t.String(),
	creator: MinimalUserSchema,
	gameSystem: GameSystemSchema,
	members: t.Array(CampaignMemberSchema),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type PublicCampaignType = Static<typeof PublicCampaignSchema>;

/** Session de campagne */
export const CampaignSessionSchema = t.Object({
	id: t.String(),
	title: t.String(),
	description: t.Nullable(t.String()),
	scheduledAt: t.Date(),
	duration: t.Number({ description: "Durée en minutes" }),
	status: SessionStatusEnum,
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type CampaignSessionType = Static<typeof CampaignSessionSchema>;

/** Fiche de personnage dans les listes */
export const CharacterListItemSchema = t.Object({
	id: t.String(),
	name: t.String(),
	type: CharacterTypeEnum,
	isActive: t.Boolean(),
	userId: t.Nullable(t.String()),
	campaignId: t.Nullable(t.String()),
	user: t.Nullable(MinimalUserSchema),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type CharacterListItemType = Static<typeof CharacterListItemSchema>;

/** Fiche de personnage complète */
export const PublicCharacterSchema = t.Object({
	id: t.String(),
	name: t.String(),
	type: CharacterTypeEnum,
	isActive: t.Boolean(),
	data: t.Unknown({ description: "Données JSONB de la fiche" }),
	userId: t.Nullable(t.String()),
	campaignId: t.Nullable(t.String()),
	user: t.Nullable(MinimalUserSchema),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export type PublicCharacterType = Static<typeof PublicCharacterSchema>;

/** Réponse liste de fiches paginée */
export const CharacterListResponse = t.Object({
	success: t.Literal(true),
	characters: t.Array(CharacterListItemSchema),
	pagination: PaginationMeta,
});

export type CharacterListResponseType = Static<typeof CharacterListResponse>;

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

/** Réponse liste de campagnes paginée */
export const CampaignListResponse = t.Object({
	success: t.Literal(true),
	campaigns: t.Array(CampaignListItemSchema),
	pagination: PaginationMeta,
});

export type CampaignListResponseType = Static<typeof CampaignListResponse>;

/** Réponse liste d'utilisateurs paginée */
export const UserListResponse = t.Object({
	success: t.Literal(true),
	users: t.Array(PublicUserSchema),
	pagination: PaginationMeta,
});

export type UserListResponseType = Static<typeof UserListResponse>;
