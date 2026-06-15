import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { logger } from "../logger";
import { resolveSessionAccess } from "./session-access";
import { sessionRooms } from "./session-rooms";

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
		logger.info({ sessionId: id }, "WS session ouverte");
		ws.send(JSON.stringify({ type: "connected", sessionId: id }));
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
		logger.info({ sessionId: id }, "WS session fermée");
	},
});
