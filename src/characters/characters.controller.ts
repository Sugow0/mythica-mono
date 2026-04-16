import { Elysia, t } from "elysia";
import {
	ErrorResponse,
	PublicCharacterSchema,
	SuccessMessageResponse,
} from "../lib/schemas";
import { getSessionFromRequest } from "../lib/session";
import {
	type CreateCharacterBody,
	createCharacterRouteSchema,
} from "./commands/create-character/create-character.dto";
import { createCharacterHandler } from "./commands/create-character/create-character.handler";
import { deactivateCharacterHandler } from "./commands/deactivate-character/deactivate-character.handler";
import { deleteCharacterHandler } from "./commands/delete-character/delete-character.handler";
import {
	type UpdateCharacterBody,
	updateCharacterRouteSchema,
} from "./commands/update-character/update-character.dto";
import { updateCharacterHandler } from "./commands/update-character/update-character.handler";
import {
	type UpdateCharacterDataBody,
	updateCharacterDataRouteSchema,
} from "./commands/update-character-data/update-character-data.dto";
import { updateCharacterDataHandler } from "./commands/update-character-data/update-character-data.handler";
import { getCharacterHandler } from "./queries/get-character/get-character.handler";
import {
	type ListCharactersQuery,
	listCharactersRouteSchema,
} from "./queries/list-characters/list-characters.dto";
import { listCharactersHandler } from "./queries/list-characters/list-characters.handler";

export const charactersController = new Elysia({ prefix: "/characters" })
	// ==================== QUERIES ====================

	/** GET /characters - Mes fiches de personnage */
	.get(
		"/",
		async ({ set, request, query }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			return listCharactersHandler(
				sessionResult.user.id,
				query as ListCharactersQuery,
			);
		},
		listCharactersRouteSchema,
	)

	/** GET /characters/:id - Détail d'une fiche */
	.get(
		"/:id",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await getCharacterHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Fiche introuvable" ? 404 : 403;
				return result;
			}
			return result;
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
					character: PublicCharacterSchema,
				}),
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Characters"],
				summary: "Détail d'une fiche de personnage",
				description: "Récupère les données complètes d'une fiche de personnage",
			},
		},
	)

	// ==================== COMMANDS ====================

	/** POST /characters - Créer une fiche */
	.post(
		"/",
		async ({ set, request, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await createCharacterHandler(
				sessionResult.user.id,
				body as CreateCharacterBody,
			);
			if (!result.success) {
				set.status = result.error.includes("déjà une fiche") ? 409 : 400;
				return result;
			}
			set.status = 201;
			return result;
		},
		createCharacterRouteSchema,
	)

	/** PUT /characters/:id - Modifier nom, isActive, campaignId */
	.put(
		"/:id",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await updateCharacterHandler(
				params.id,
				sessionResult.user.id,
				body as UpdateCharacterBody,
			);
			if (!result.success) {
				set.status =
					result.error === "Fiche introuvable"
						? 404
						: result.error === "Accès non autorisé"
							? 403
							: 400;
				return result;
			}
			return result;
		},
		updateCharacterRouteSchema,
	)

	/** PATCH /characters/:id/data - Remplacer les données JSONB */
	.patch(
		"/:id/data",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await updateCharacterDataHandler(
				params.id,
				sessionResult.user.id,
				body as UpdateCharacterDataBody,
			);
			if (!result.success) {
				set.status =
					result.error === "Fiche introuvable"
						? 404
						: result.error === "Accès non autorisé"
							? 403
							: 400;
				return result;
			}
			return result;
		},
		updateCharacterDataRouteSchema,
	)

	/** PUT /characters/:id/deactivate - Désactiver une fiche */
	.put(
		"/:id/deactivate",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await deactivateCharacterHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status =
					result.error === "Fiche introuvable"
						? 404
						: result.error === "Accès non autorisé"
							? 403
							: 400;
				return result;
			}
			return result;
		},
		{
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Characters"],
				summary: "Désactiver une fiche de personnage",
			},
		},
	)

	/** DELETE /characters/:id - Supprimer une fiche */
	.delete(
		"/:id",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await deleteCharacterHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status =
					result.error === "Fiche introuvable"
						? 404
						: result.error === "Accès non autorisé"
							? 403
							: 400;
				return result;
			}
			return result;
		},
		{
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Characters"],
				summary: "Supprimer une fiche de personnage",
			},
		},
	);
