import { redis } from "../lib/redis";
import { logger } from "../logger";

/**
 * Nom du cookie de session posé par Lucia côté plateforme (valeur par défaut
 * de Lucia v3, non surchargée dans mythica-api). La valeur du cookie est
 * directement l'id de session.
 */
const SESSION_COOKIE_NAME = "auth_session";

/** Préfixe des clés de session dans Redis (cf. lucia-redis-adapter de l'api). */
const SESSION_PREFIX = "session:";

/** En-têtes injectés vers les services en aval pour transporter l'identité. */
export const USER_ID_HEADER = "x-user-id";
export const USER_ROLE_HEADER = "x-user-role";

export type ResolvedUser = {
	id: string;
	role: string | null;
};

type StoredSession = {
	userId: string;
	expiresAt: number;
	attributes?: { role?: string };
};

/** Extrait l'id de session du header Cookie, sans dépendre de Lucia. */
function readSessionId(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === SESSION_COOKIE_NAME) {
			return rest.join("=") || null;
		}
	}
	return null;
}

/**
 * Valide la session de la requête contre Redis et retourne l'utilisateur
 * (id + rôle). Retourne null si pas de cookie, session inexistante ou expirée.
 */
export async function resolveUser(request: Request): Promise<ResolvedUser | null> {
	const sessionId = readSessionId(request.headers.get("cookie"));
	if (!sessionId) return null;

	try {
		const raw = await redis.get(`${SESSION_PREFIX}${sessionId}`);
		if (!raw) return null;

		const data = JSON.parse(raw) as Partial<StoredSession>;
		if (!data.userId) return null;
		if (data.expiresAt && data.expiresAt < Date.now()) return null;

		return { id: data.userId, role: data.attributes?.role ?? null };
	} catch (err) {
		logger.error({ err }, "Erreur de validation de session");
		return null;
	}
}
