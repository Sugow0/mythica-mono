import { error, redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { ApiError, campaignService } from "$lib/index.js";

export const ssr = false;

export const load: PageLoad = async ({ params, parent }) => {
	const { user } = await parent();
	if (!user) throw redirect(302, "/login");

	try {
		const data = await campaignService.getSession(params.id);
		if (!data) throw error(404, "Session introuvable");

		const { campaignCharacterSheetsService } =
			await import("$lib/api/services/campaign-character-sheets-service");
		const campaignSheets = await campaignCharacterSheetsService
			.getCampaignSheets(data.campaign.id)
			.catch(() => []);

		return {
			session: data.session,
			campaign: data.campaign,
			members: data.members,
			user,
			campaignSheets,
		};
	} catch (err: unknown) {
		if (err && typeof err === "object" && "status" in err) throw err;
		if (err instanceof ApiError)
			throw error(err.statusCode ?? 500, err.message);
		throw error(500, "Erreur lors du chargement de la session");
	}
};
