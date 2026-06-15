import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { logger } from "../logger";
import { resolveSessionAccess } from "./session-access";
import { sessionPresence } from "./session-presence-ws";
import { sessionRooms } from "./session-rooms";
import { buildSessionSnapshot } from "./session-snapshot";

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

	async message(ws, message) {
		// Diffuse le message à toute la room de la session (toutes instances).
		await sessionRooms.broadcast(ws.data.params.id, {
			type: "message",
			payload: message,
		});
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
