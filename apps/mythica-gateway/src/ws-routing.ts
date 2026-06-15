import {
	type ResolvedUser,
	USER_ID_HEADER,
	USER_ROLE_HEADER,
} from "./auth/session";

/**
 * Calcule l'URL upstream d'une connexion WebSocket à partir du chemin entrant.
 * Route `/gameplay/*` vers le service gameplay, le reste vers l'API, en retirant
 * le préfixe (comme le proxy HTTP).
 */
export function buildTargetUrl(
	url: URL,
	gameplaySocketUrl: string,
	apiSocketUrl: string,
): string {
	const isGameplay = url.pathname.startsWith("/gameplay");
	const targetBase = (isGameplay ? gameplaySocketUrl : apiSocketUrl).replace(
		/^http/,
		"ws",
	);
	const prefix = isGameplay ? "/gameplay" : "/api";
	const targetPath = url.pathname.slice(prefix.length) || "/";
	return `${targetBase}${targetPath}${url.search}`;
}

/**
 * En-têtes d'identité à transmettre au service upstream. Comme l'upstream est
 * ouvert par le gateway, seuls ces en-têtes (issus de la session validée) sont
 * envoyés : aucun en-tête d'identité forgé par le client n'est propagé.
 */
export function buildUpstreamHeaders(
	user: ResolvedUser | null,
): Record<string, string> {
	if (!user) return {};
	const headers: Record<string, string> = { [USER_ID_HEADER]: user.id };
	if (user.role) headers[USER_ROLE_HEADER] = user.role;
	return headers;
}
