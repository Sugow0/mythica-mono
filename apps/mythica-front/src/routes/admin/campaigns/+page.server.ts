import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay`;
	const cookieHeader = request.headers.get("cookie") ?? "";
	const page = Number(url.searchParams.get("page") ?? "1");
	const limit = 20;

	const res = await fetch(`${apiUrl}/campaigns/?page=${page}&limit=${limit}`, {
		headers: { Cookie: cookieHeader },
	});

	if (!res.ok) {
		return { campaigns: [], page, totalPages: 1, total: 0 };
	}

	const body = await res.json();
	const campaigns = body?.campaigns ?? body?.data ?? [];
	const pagination = body?.pagination ?? {};

	return {
		campaigns,
		page: pagination.page ?? page,
		totalPages: pagination.totalPages ?? 1,
		total: pagination.total ?? 0,
	};
};
