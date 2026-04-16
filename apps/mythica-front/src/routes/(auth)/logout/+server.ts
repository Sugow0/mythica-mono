import { redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ fetch, request, cookies }) => {
	const apiUrl = `${env.PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
	const cookieHeader = request.headers.get("cookie") ?? "";

	try {
		await fetch(`${apiUrl}/identity/logout`, {
			method: "POST",
			headers: { Cookie: cookieHeader },
		});
	} catch {
		// on continue même si l'API échoue
	}

	// Effacer tous les cookies de session connus
	for (const name of cookies.getAll().map((c) => c.name)) {
		cookies.delete(name, { path: "/" });
	}

	redirect(303, "/");
};
