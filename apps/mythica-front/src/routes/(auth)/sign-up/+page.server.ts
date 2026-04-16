import { fail } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { Actions } from "./$types";

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const formData = await request.formData();
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const confirmPassword = String(formData.get("confirmPassword") ?? "");
		const firstName = String(formData.get("firstName") ?? "").trim();
		const lastName = String(formData.get("lastName") ?? "").trim();
		const pseudo =
			String(formData.get("pseudo") ?? "").trim() || firstName.toLowerCase();

		const fields = { email, firstName, lastName, pseudo };

		if (!email || !password || !firstName || !lastName) {
			return fail(400, {
				...fields,
				error: "Tous les champs obligatoires doivent être remplis.",
			});
		}

		if (password.length < 8) {
			return fail(400, {
				...fields,
				error: "Le mot de passe doit contenir au moins 8 caractères.",
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				...fields,
				error: "Les mots de passe ne correspondent pas.",
			});
		}

		const apiUrl = `${env.PUBLIC_API_URL ?? "http://localhost:2100"}/api`;

		let response: Response;
		try {
			response = await fetch(`${apiUrl}/identity/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, firstName, lastName, pseudo }),
			});
		} catch {
			return fail(503, {
				...fields,
				error: "Impossible de joindre le serveur. Réessayez.",
			});
		}

		let body: Record<string, unknown> | null = null;
		try {
			body = await response.json();
		} catch {
			/* réponse non-JSON */
		}

		if (!response.ok) {
			const error =
				(body?.error as string) ??
				`Échec de l'inscription (${response.status}).`;
			return fail(response.status >= 400 ? response.status : 400, {
				...fields,
				error,
			});
		}

		return { success: true, email };
	},
};
