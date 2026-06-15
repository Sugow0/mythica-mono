import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ fetch, request }) => {
	const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
	const cookieHeader = request.headers.get("cookie");

	if (!cookieHeader) {
		return { user: null };
	}

	try {
		const response = await fetch(`${apiUrl}/identity/me`, {
			headers: { Cookie: cookieHeader },
		});

		if (!response.ok) {
			return { user: null };
		}

		const body = await response.json();
		const user = body?.user ?? body;
		return { user };
	} catch {
		return { user: null };
	}
};
