/** DTO et validation pour la création d'une fiche de personnage */
import { type Static, t } from "elysia";
import { CharacterTypeEnum, ErrorResponse } from "../../../lib/schemas";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 100;

// ==================== SCHÉMA REQUEST ====================

export const CreateCharacterBodySchema = t.Object({
	name: t.String({
		minLength: NAME_MIN_LENGTH,
		maxLength: NAME_MAX_LENGTH,
		description: `Nom du personnage (${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} caractères)`,
	}),
	type: t.Optional(CharacterTypeEnum),
	data: t.Optional(
		t.Record(t.String(), t.Unknown(), {
			description: "Données libres de la fiche (JSONB)",
		}),
	),
	campaignId: t.Optional(
		t.String({ description: "ID de la campagne (optionnel)" }),
	),
});

export type CreateCharacterBody = Static<typeof CreateCharacterBodySchema>;

// ==================== SCHÉMA RESPONSE ====================

export const CreateCharacterResponse = t.Object({
	success: t.Literal(true),
	characterId: t.String({ description: "ID de la fiche créée" }),
});

// ==================== SCHÉMAS ROUTE ====================

export const createCharacterRouteSchema = {
	body: CreateCharacterBodySchema,
	response: {
		201: CreateCharacterResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		409: ErrorResponse,
	},
	detail: {
		tags: ["Characters"],
		summary: "Créer une fiche de personnage",
		description:
			"Crée une nouvelle fiche de personnage. Un joueur ne peut avoir qu'une fiche PLAYER active par campagne.",
	},
};
