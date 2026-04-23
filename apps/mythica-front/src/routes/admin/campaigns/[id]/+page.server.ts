import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, request, params }) => {
	const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
	const cookieHeader = request.headers.get("cookie") ?? "";

	const res = await fetch(`${apiUrl}/campaigns/${params.id}`, {
		headers: { Cookie: cookieHeader },
	});

	if (!res.ok) {
		return { campaign: null };
	}

	const body = await res.json();
	const campaign = body?.campaign ?? body;

	return { campaign };
};
