import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, request }) => {
	const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
	const cookieHeader = request.headers.get("cookie") ?? "";
	const headers = { Cookie: cookieHeader };

	const [usersRes, campaignsRes] = await Promise.all([
		fetch(`${apiUrl}/identity/users?page=1&limit=1`, { headers }),
		fetch(`${apiUrl}/campaigns/?page=1&limit=100`, { headers }),
	]);

	let totalUsers = 0;
	let totalCampaigns = 0;
	let activeCampaigns = 0;
	let draftCampaigns = 0;
	let archivedCampaigns = 0;
	let publicCampaigns = 0;
	let privateCampaigns = 0;

	if (usersRes.ok) {
		const body = await usersRes.json();
		totalUsers = body?.pagination?.total ?? 0;
	}

	if (campaignsRes.ok) {
		const body = await campaignsRes.json();
		totalCampaigns = body?.pagination?.total ?? 0;
		const campaigns: { status?: string; visibility?: string }[] =
			body?.campaigns ?? body?.data ?? [];
		for (const c of campaigns) {
			if (c.status === "ACTIVE") activeCampaigns++;
			else if (c.status === "DRAFT") draftCampaigns++;
			else if (c.status === "ARCHIVED") archivedCampaigns++;
			if (c.visibility === "PUBLIC") publicCampaigns++;
			else if (c.visibility === "PRIVATE") privateCampaigns++;
		}
	}

	return {
		totalUsers,
		totalCampaigns,
		activeCampaigns,
		draftCampaigns,
		archivedCampaigns,
		publicCampaigns,
		privateCampaigns,
	};
};
