import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { logger } from "../logger";
import { resolveSessionAccess } from "./session-access";

/**
 * Serveur WebSocket des sessions de jeu.
 *
 * Route `/sessions/:id/ws` : la connexion est authentifiée via l'identité
 * injectée par le gateway (en-tête `x-user-id`, dérivé en `currentUser`) et
 * réservée aux membres de la campagne. Le gateway valide le cookie de session
 * à l'upgrade et propage l'identité : ce service ne fait que la faire respecter.
 *
 * Pour l'instant le handler se limite au setup (handshake + accusé de réception
 * applicatif) ; la gestion des rooms et la diffusion temps réel arrivent dans
 * les tickets suivants.
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

	open(ws) {
		const { id } = ws.data.params;
		logger.info({ sessionId: id }, "WS session ouverte");
		ws.send(JSON.stringify({ type: "connected", sessionId: id }));
	},

	message(ws, message) {
		// Écho applicatif minimal : confirme la liaison bidirectionnelle.
		// La diffusion par room sera ajoutée avec la gestion de session.
		ws.send(JSON.stringify({ type: "ack", payload: message }));
	},

	close(ws) {
		logger.info({ sessionId: ws.data.params.id }, "WS session fermée");
	},
});
