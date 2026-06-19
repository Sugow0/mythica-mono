import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Les visiteurs anonymes voient la landing ; les utilisateurs connectés sont
// redirigés vers l'app (exploration des campagnes), d'où ils accèdent à la
// navigation applicative (campagnes, personnages, etc.).
export const load: PageLoad = async ({ parent }) => {
	const { user } = await parent();
	if (user) redirect(307, "/campaigns");
};
