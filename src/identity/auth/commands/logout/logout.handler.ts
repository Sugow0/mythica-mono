import { lucia } from "../../../../lib/auth";

export type LogoutResult = { setCookieHeader: string };

/**
 * Invalide la session (Redis) et retourne l'en-tête Set-Cookie pour effacer le cookie côté client.
 * Si aucune session n'est fournie, retourne quand même le cookie vide pour nettoyer le client.
 */
export async function logoutHandler(
	cookieHeader: string | null,
): Promise<LogoutResult> {
	const sessionId = cookieHeader ? lucia.readSessionCookie(cookieHeader) : null;
	if (sessionId) {
		await lucia.invalidateSession(sessionId);
	}
	const blankCookie = lucia.createBlankSessionCookie();
	return { setCookieHeader: blankCookie.serialize() };
}
