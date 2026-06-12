import { Elysia } from "elysia";

/** En-têtes d'identité injectés par le gateway après validation de session. */
const USER_ID_HEADER = "x-user-id";
const USER_ROLE_HEADER = "x-user-role";

export type CurrentUser = {
	id: string;
	role: string | null;
};

/**
 * Plugin Elysia qui dérive l'utilisateur courant depuis les en-têtes injectés
 * par le gateway. `currentUser` vaut null si la requête n'est pas authentifiée.
 *
 * La confiance dans ces en-têtes repose sur le fait que le gateway est le seul
 * point d'entrée public et qu'il retire tout X-User-* entrant avant injection.
 */
export const authContext = new Elysia({ name: "auth-context" }).derive(
	{ as: "global" },
	({ headers }) => {
		const id = headers[USER_ID_HEADER];
		if (!id) {
			return { currentUser: null as CurrentUser | null };
		}
		const role = headers[USER_ROLE_HEADER] ?? null;
		return { currentUser: { id, role } as CurrentUser | null };
	},
);

/** Vrai si l'utilisateur courant est un administrateur de la plateforme. */
export function isAdmin(user: CurrentUser | null): boolean {
	return user?.role === "ADMIN";
}
