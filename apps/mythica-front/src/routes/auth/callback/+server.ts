import { redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

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

export const GET: RequestHandler = async ({ request, cookies, fetch }) => {
	const apiUrl = `${env.PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
	const cookieHeader = request.headers.get("cookie");

	if (cookieHeader) {
		try {
			const response = await fetch(`${apiUrl}/identity/me`, {
				headers: { Cookie: cookieHeader },
			});

			if (response.ok) {
				forwardSetCookies(response, cookies);
			}
		} catch {
			// silently continue — user will land on "/" unauthenticated
		}
	}

	redirect(303, "/");
};
