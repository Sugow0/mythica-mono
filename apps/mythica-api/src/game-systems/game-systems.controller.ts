import { Elysia, t } from "elysia";
import {
	ErrorResponse,
	GameSystemSchema,
	SuccessMessageResponse,
} from "../lib/schemas";
import { getSessionFromRequest } from "../lib/session";
import {
	type CreateGameSystemBody,
	createGameSystemRouteSchema,
} from "./commands/create-game-system/create-game-system.dto";
import { createGameSystemHandler } from "./commands/create-game-system/create-game-system.handler";
import {
	type CreateVersionBody,
	createVersionRouteSchema,
} from "./commands/create-version/create-version.dto";
import { createVersionHandler } from "./commands/create-version/create-version.handler";
import { deleteGameSystemHandler } from "./commands/delete-game-system/delete-game-system.handler";
import { deleteVersionHandler } from "./commands/delete-version/delete-version.handler";
import {
	type UpdateGameSystemBody,
	updateGameSystemRouteSchema,
} from "./commands/update-game-system/update-game-system.dto";
import { updateGameSystemHandler } from "./commands/update-game-system/update-game-system.handler";
import {
	type UpdateVersionBody,
	updateVersionRouteSchema,
} from "./commands/update-version/update-version.dto";
import { updateVersionHandler } from "./commands/update-version/update-version.handler";
import { getGameSystemByIdHandler } from "./queries/get-game-system-by-id/get-game-system-by-id.handler";
import {
	type GetGameSystemsQuery,
	getGameSystemsRouteSchema,
} from "./queries/get-game-systems/get-game-systems.dto";
import { getGameSystemsHandler } from "./queries/get-game-systems/get-game-systems.handler";

export const gameSystemsController = new Elysia({ prefix: "/game-systems" })

	// ==================== QUERIES ====================

	/** GET /game-systems - Liste des systèmes de jeu */
	.get(
		"/",
		async ({ query }) => {
			return await getGameSystemsHandler(query as GetGameSystemsQuery);
		},
		getGameSystemsRouteSchema,
	)

	/** GET /game-systems/:id - Détails d'un système de jeu */
	.get(
		"/:id",
		async ({ set, params }) => {
			const result = await getGameSystemByIdHandler(params.id);
			if (!result.success) {
				set.status = 404;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, gameSystem: result.gameSystem };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					gameSystem: GameSystemSchema,
				}),
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Détails d'un système de jeu",
				description: "Récupère les détails d'un système de jeu par son ID",
			},
		},
	)

	// ==================== COMMANDS ====================

	/** POST /game-systems - Créer un système de jeu */
	.post(
		"/",
		async ({ set, request, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (sessionResult.user.role !== "ADMIN") {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			const result = await createGameSystemHandler(
				body as CreateGameSystemBody,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			return { success: true as const, gameSystemId: result.gameSystemId };
		},
		createGameSystemRouteSchema,
	)

	/** PUT /game-systems/:id - Modifier un système de jeu */
	.put(
		"/:id",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (sessionResult.user.role !== "ADMIN") {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			const result = await updateGameSystemHandler(
				params.id,
				body as UpdateGameSystemBody,
			);
			if (!result.success) {
				set.status = result.error === "Système de jeu introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Système de jeu modifié" };
		},
		{
			params: t.Object({ id: t.String() }),
			...updateGameSystemRouteSchema,
		},
	)

	/** DELETE /game-systems/:id - Supprimer un système de jeu */
	.delete(
		"/:id",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (sessionResult.user.role !== "ADMIN") {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			const result = await deleteGameSystemHandler(params.id);
			if (!result.success) {
				set.status = result.error === "Système de jeu introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Système de jeu supprimé" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Supprimer un système de jeu",
				description:
					"Supprime un système de jeu (admin uniquement, impossible si utilisé par des campagnes)",
			},
		},
	)

	// ==================== VERSIONS ====================

	/** POST /game-systems/:id/versions - Ajouter une version */
	.post(
		"/:id/versions",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (sessionResult.user.role !== "ADMIN") {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			const result = await createVersionHandler(
				params.id,
				body as CreateVersionBody,
			);
			if (!result.success) {
				set.status = result.error === "Système de jeu introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			return { success: true as const, versionId: result.versionId };
		},
		{
			params: t.Object({ id: t.String() }),
			...createVersionRouteSchema,
		},
	)

	/** PUT /game-systems/:id/versions/:versionId - Modifier une version */
	.put(
		"/:id/versions/:versionId",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (sessionResult.user.role !== "ADMIN") {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			const result = await updateVersionHandler(
				params.id,
				params.versionId,
				body as UpdateVersionBody,
			);
			if (!result.success) {
				set.status = result.error === "Version introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Version modifiée" };
		},
		{
			params: t.Object({ id: t.String(), versionId: t.String() }),
			...updateVersionRouteSchema,
		},
	)

	/** DELETE /game-systems/:id/versions/:versionId - Supprimer une version */
	.delete(
		"/:id/versions/:versionId",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			if (sessionResult.user.role !== "ADMIN") {
				set.status = 403;
				return {
					success: false as const,
					error: "Accès réservé aux administrateurs",
				};
			}

			const result = await deleteVersionHandler(params.id, params.versionId);
			if (!result.success) {
				set.status = 404;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Version supprimée" };
		},
		{
			params: t.Object({ id: t.String(), versionId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["GameSystems"],
				summary: "Supprimer une version",
				description:
					"Supprime une version d'un système de jeu (admin uniquement)",
			},
		},
	);
