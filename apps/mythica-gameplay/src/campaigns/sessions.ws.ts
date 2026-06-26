import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { logger } from "../logger";
import { resolveSessionAccess } from "./session-access";
import { handleCombatCommand, parseCombatCommand } from "./session-combat";
import { handleMapCommand, parseMapCommand } from "./session-map";
import { sessionPresence } from "./session-presence-ws";
import { sessionRooms } from "./session-rooms";
import { buildSessionSnapshot } from "./session-snapshot";
import { handleTokenCommand, parseTokenCommand } from "./session-tokens";
import { handleWallCommand, parseWallCommand } from "./session-walls";

/**
 * Serveur WebSocket des sessions de jeu.
 *
 * Route `/sessions/:id/ws` : la connexion est authentifiée via l'identité
 * injectée par le gateway (en-tête `x-user-id`, dérivé en `currentUser`) et
 * réservée aux membres de la campagne. Le gateway valide le cookie de session
 * à l'upgrade et propage l'identité : ce service ne fait que la faire respecter.
 *
 * Chaque socket rejoint la room de sa session (cf. `session-rooms`) : les
 * messages sont diffusés à tous les participants, y compris sur d'autres
 * instances via Redis. La sémantique applicative (présence, snapshot…) sera
 * ajoutée dans les tickets suivants.
 */
export const sessionsWs = new Elysia().use(authContext).ws("/sessions/:id/ws", {
	params: t.Object({ id: t.String() }),

	async beforeHandle({ currentUser, params, set }) {
		const access = await resolveSessionAccess(params.id, currentUser);
		if (!access.ok) {
			// Une valeur retournée par beforeHandle empêche l'upgrade WebSocket.
			set.status = access.status;
			return { success: false as const, error: access.error };
		}
	},

	async open(ws) {
		const { id } = ws.data.params;
		await sessionRooms.joinRoom(id, ws);
		// Diffuse PRESENCE_JOIN à la room (sauf reconnexion en délai de grâce).
		const userId = ws.data.currentUser?.id;
		if (userId) sessionPresence.connect(id, userId);
		// Snapshot initial envoyé uniquement au client qui se connecte : il se
		// synchronise (participants, carte, tour actif, historique chat) sans
		// requête supplémentaire.
		const snapshot = await buildSessionSnapshot(
			id,
			sessionPresence.participants(id),
		);
		ws.send(JSON.stringify(snapshot ?? { type: "connected", sessionId: id }));
		logger.info({ sessionId: id, userId }, "WS session ouverte");
	},

	async message(ws, raw) {
		// Les trames entrantes sont des commandes de contrôle :
		// - Suivi de combat (initiative), réservé au MJ
		// - Déplacement/modification/suppression de tokens
		const userId = ws.data.currentUser?.id;
		if (!userId) return;
		const { id } = ws.data.params;

		const combatCommand = parseCombatCommand(raw);
		if (combatCommand) {
			const event = await handleCombatCommand(id, userId, combatCommand);
			if (event) await sessionRooms.broadcast(id, event);
			return;
		}

		const tokenCommand = parseTokenCommand(raw);
		if (tokenCommand) {
			const event = await handleTokenCommand(id, userId, tokenCommand);
			if (event) await sessionRooms.broadcast(id, event);
			return;
		}

		const mapCmd = parseMapCommand(raw);
		if (mapCmd) {
			const event = await handleMapCommand(id, userId, mapCmd);
			if (event) await sessionRooms.broadcast(id, event);
			return;
		}

		const wallCmd = parseWallCommand(raw);
		if (wallCmd) {
			const event = await handleWallCommand(id, userId, wallCmd);
			if (event) await sessionRooms.broadcast(id, event);
			return;
		}

		if (
			raw &&
			typeof raw === "object" &&
			"type" in raw &&
			raw.type === "PRESENCE_RENAME" &&
			"name" in raw &&
			typeof raw.name === "string"
		) {
			await sessionRooms.broadcast(id, {
				type: "PRESENCE_RENAME",
				userId,
				name: raw.name.slice(0, 50),
			});
			return;
		}
	},

	async close(ws) {
		const { id } = ws.data.params;
		await sessionRooms.leaveRoom(id, ws);
		// Démarre le délai de grâce avant d'émettre PRESENCE_LEAVE.
		const userId = ws.data.currentUser?.id;
		if (userId) sessionPresence.disconnect(id, userId);
		logger.info({ sessionId: id, userId }, "WS session fermée");
	},
});
