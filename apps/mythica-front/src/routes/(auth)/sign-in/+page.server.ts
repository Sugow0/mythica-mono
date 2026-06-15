import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

function forwardSetCookies(
	response: Response,
	cookies: import("@sveltejs/kit").Cookies
): void {
	const rawCookies: string[] =
		typeof (response.headers as Headers & { getSetCookie?(): string[] })
			.getSetCookie === "function"
			? (
					response.headers as Headers & { getSetCookie(): string[] }
				).getSetCookie()
			: ([response.headers.get("set-cookie")].filter(Boolean) as string[]);

	for (const raw of rawCookies) {
		const [nameVal, ...attrs] = raw.split(";").map((s) => s.trim());
		const eqIdx = nameVal.indexOf("=");
		if (eqIdx < 0) continue;

		const name = nameVal.slice(0, eqIdx);
		const value = nameVal.slice(eqIdx + 1);
		const opts: {
			path: string;
			httpOnly?: boolean;
			secure?: boolean;
			sameSite?: "lax" | "strict" | "none";
			maxAge?: number;
			domain?: string;
		} = { path: "/" };

		for (const attr of attrs) {
			const sepIdx = attr.indexOf("=");
			const key = (sepIdx >= 0 ? attr.slice(0, sepIdx) : attr)
				.toLowerCase()
				.trim();
			const val = sepIdx >= 0 ? attr.slice(sepIdx + 1).trim() : "";
			if (key === "httponly") opts.httpOnly = true;
			else if (key === "secure") opts.secure = true;
			else if (key === "path") opts.path = val || "/";
			else if (key === "domain") opts.domain = val;
			else if (key === "samesite")
				opts.sameSite = val.toLowerCase() as "lax" | "strict" | "none";
			else if (key === "max-age") opts.maxAge = parseInt(val, 10);
		}

		cookies.set(name, value, opts);
	}
}

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");

		if (!email || !password) {
			return fail(400, { error: "Email et mot de passe requis.", email });
		}

		const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;

		let response: Response;
		try {
			response = await fetch(`${apiUrl}/identity/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
		} catch {
			return fail(503, {
				error: "Impossible de joindre le serveur. Réessayez.",
				email,
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
				`Échec de l'authentification (${response.status}).`;
			return fail(response.status >= 400 ? response.status : 400, {
				error,
				email,
			});
		}

		forwardSetCookies(response, cookies);

		if (body?.requiresTwoFactor) {
			return { requiresTwoFactor: true, tempToken: body.tempToken as string };
		}

		redirect(303, "/");
	},
};
