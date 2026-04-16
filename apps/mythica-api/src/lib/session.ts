import type { Session, User } from "lucia";
import { lucia } from "./auth";

export type SessionResult =
	| { ok: true; user: User; session: Session }
	| { ok: false; reason: "no_cookie" | "invalid_session" };

/**
 * Lit le cookie de session de la requête et valide la session.
 * Retourne l'utilisateur et la session si authentifié, sinon un raison d'échec.
 */
export async function getSessionFromRequest(
	request: Request,
): Promise<SessionResult> {
	const cookieHeader = request.headers.get("Cookie") ?? null;
	const sessionId = cookieHeader ? lucia.readSessionCookie(cookieHeader) : null;
	if (!sessionId) {
		return { ok: false, reason: "no_cookie" };
	}
	const { user, session } = await lucia.validateSession(sessionId);
	if (!user || !session) {
		return { ok: false, reason: "invalid_session" };
	}
	return { ok: true, user, session };
}
