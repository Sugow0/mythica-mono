import { Elysia, t } from "elysia";
import {
	ErrorResponse,
	PublicCampaignSchema,
	SuccessMessageResponse,
} from "../lib/schemas";
import { getSessionFromRequest } from "../lib/session";
import { acceptInvitationHandler } from "./commands/accept-invitation/accept-invitation.handler";
import { acceptSessionHandler } from "./commands/accept-session/accept-session.handler";
import { archiveCampaignHandler } from "./commands/archive-campaign/archive-campaign.handler";
import { cancelSessionHandler } from "./commands/cancel-session/cancel-session.handler";
import { completeSessionHandler } from "./commands/complete-session/complete-session.handler";
// Commands
import {
	type CreateCampaignBody,
	createCampaignRouteSchema,
} from "./commands/create-campaign/create-campaign.dto";
import { createCampaignHandler } from "./commands/create-campaign/create-campaign.handler";
import {
	type CreateSessionBody,
	createSessionRouteSchema,
} from "./commands/create-session/create-session.dto";
import { createSessionHandler } from "./commands/create-session/create-session.handler";
import { deleteCampaignHandler } from "./commands/delete-campaign/delete-campaign.handler";
import { demoteMemberHandler } from "./commands/demote-member/demote-member.handler";
import {
	type InviteMemberBody,
	inviteMemberRouteSchema,
} from "./commands/invite-member/invite-member.dto";
import { inviteMemberHandler } from "./commands/invite-member/invite-member.handler";
import { joinCampaignHandler } from "./commands/join-campaign/join-campaign.handler";
import { kickMemberHandler } from "./commands/kick-member/kick-member.handler";
import { leaveCampaignHandler } from "./commands/leave-campaign/leave-campaign.handler";
import { promoteMemberHandler } from "./commands/promote-member/promote-member.handler";
import { refuseInvitationHandler } from "./commands/refuse-invitation/refuse-invitation.handler";
import {
	type UpdateCampaignBody,
	updateCampaignRouteSchema,
} from "./commands/update-campaign/update-campaign.dto";
import { updateCampaignHandler } from "./commands/update-campaign/update-campaign.handler";
import {
	type UpdateSessionBody,
	updateSessionRouteSchema,
} from "./commands/update-session/update-session.dto";
import { updateSessionHandler } from "./commands/update-session/update-session.handler";
import {
	type GetArchivedCampaignsQuery,
	getArchivedCampaignsRouteSchema,
} from "./queries/get-archived-campaigns/get-archived-campaigns.dto";
import { getArchivedCampaignsHandler } from "./queries/get-archived-campaigns/get-archived-campaigns.handler";
import { getCampaignByIdHandler } from "./queries/get-campaign-by-id/get-campaign-by-id.handler";
// Queries
import {
	type GetCampaignsQuery,
	getCampaignsRouteSchema,
} from "./queries/get-campaigns/get-campaigns.dto";
import { getCampaignsHandler } from "./queries/get-campaigns/get-campaigns.handler";
import {
	type GetMyCampaignsQuery,
	getMyCampaignsRouteSchema,
} from "./queries/get-my-campaigns/get-my-campaigns.dto";
import { getMyCampaignsHandler } from "./queries/get-my-campaigns/get-my-campaigns.handler";
import {
	type SearchCampaignsQuery,
	searchCampaignsRouteSchema,
} from "./queries/search-campaigns/search-campaigns.dto";
import { searchCampaignsHandler } from "./queries/search-campaigns/search-campaigns.handler";

export const campaignsController = new Elysia({ prefix: "/campaigns" })
	// ==================== QUERIES ====================

	/** GET /campaigns - Liste des campagnes publiques */
	.get(
		"/",
		async ({ query }) => {
			const result = await getCampaignsHandler(query as GetCampaignsQuery);
			return result;
		},
		getCampaignsRouteSchema,
	)

	/** GET /campaigns/my - Liste de mes campagnes */
	.get(
		"/my",
		async ({ set, request, query }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await getMyCampaignsHandler(
				sessionResult.user.id,
				query as GetMyCampaignsQuery,
			);
			return result;
		},
		getMyCampaignsRouteSchema,
	)

	/** GET /campaigns/archived - Liste des campagnes archivées */
	.get(
		"/archived",
		async ({ set, request, query }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await getArchivedCampaignsHandler(
				sessionResult.user.id,
				query as GetArchivedCampaignsQuery,
			);
			return result;
		},
		getArchivedCampaignsRouteSchema,
	)

	/** GET /campaigns/search - Rechercher des campagnes */
	.get(
		"/search",
		async ({ query }) => {
			const result = await searchCampaignsHandler(
				query as SearchCampaignsQuery,
			);
			return result;
		},
		searchCampaignsRouteSchema,
	)

	/** GET /campaigns/:id - Détails d'une campagne */
	.get(
		"/:id",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			const userId = sessionResult.ok ? sessionResult.user.id : undefined;

			const result = await getCampaignByIdHandler(params.id, userId);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, campaign: result.campaign };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					success: t.Literal(true),
					campaign: PublicCampaignSchema,
				}),
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Détails d'une campagne",
				description: "Récupère les détails d'une campagne par son ID",
			},
		},
	)

	// ==================== COMMANDS ====================

	/** POST /campaigns - Créer une campagne */
	.post(
		"/",
		async ({ set, request, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await createCampaignHandler(
				sessionResult.user.id,
				body as CreateCampaignBody,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			return { success: true as const, campaignId: result.campaignId };
		},
		createCampaignRouteSchema,
	)

	/** POST /campaigns/:id/invite - Inviter un utilisateur */
	.post(
		"/:id/invite",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await inviteMemberHandler(
				params.id,
				sessionResult.user.id,
				body as InviteMemberBody,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			return {
				success: true as const,
				invitationId: result.invitationId,
				message: "Invitation envoyée",
			};
		},
		inviteMemberRouteSchema,
	)

	/** PUT /campaigns/:id - Modifier une campagne */
	.put(
		"/:id",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await updateCampaignHandler(
				params.id,
				sessionResult.user.id,
				body as UpdateCampaignBody,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Campagne modifiée" };
		},
		updateCampaignRouteSchema,
	)

	/** PUT /campaigns/:id/join - Rejoindre une campagne publique */
	.put(
		"/:id/join",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await joinCampaignHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Vous avez rejoint la campagne",
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Rejoindre une campagne",
				description: "Rejoindre une campagne publique",
			},
		},
	)

	/** PUT /campaigns/:id/leave - Quitter une campagne */
	.put(
		"/:id/leave",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await leaveCampaignHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Vous avez quitté la campagne",
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Quitter une campagne",
				description: "Quitter une campagne dont vous êtes membre",
			},
		},
	)

	/** PUT /campaigns/:id/kick/:userId - Expulser un membre */
	.put(
		"/:id/kick/:userId",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await kickMemberHandler(
				params.id,
				sessionResult.user.id,
				params.userId,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Membre expulsé de la campagne",
			};
		},
		{
			params: t.Object({ id: t.String(), userId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Expulser un membre",
				description:
					"Expulser un membre de la campagne (admin/créateur uniquement)",
			},
		},
	)

	/** PUT /campaigns/:id/archive - Archiver une campagne */
	.put(
		"/:id/archive",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await archiveCampaignHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Campagne archivée" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Archiver une campagne",
				description: "Archiver une campagne (créateur uniquement)",
			},
		},
	)

	/** DELETE /campaigns/:id - Supprimer une campagne */
	.delete(
		"/:id",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await deleteCampaignHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Campagne supprimée" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Supprimer une campagne",
				description:
					"Supprime définitivement une campagne (créateur uniquement)",
			},
		},
	)

	// ==================== SCHEDULE ====================

	/** POST /campaigns/:id/schedule - Planifier une session */
	.post(
		"/:id/schedule",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await createSessionHandler(
				params.id,
				sessionResult.user.id,
				body as CreateSessionBody,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			set.status = 201;
			return { success: true as const, sessionId: result.sessionId };
		},
		createSessionRouteSchema,
	)

	/** POST /campaigns/:id/schedule/:sessionId - Modifier une session */
	.post(
		"/:id/schedule/:sessionId",
		async ({ set, request, params, body }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await updateSessionHandler(
				params.id,
				params.sessionId,
				sessionResult.user.id,
				body as UpdateSessionBody,
			);
			if (!result.success) {
				set.status = result.error === "Session introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Session modifiée" };
		},
		updateSessionRouteSchema,
	)

	/** POST /campaigns/:id/schedule/:sessionId/accept - Accepter une session */
	.post(
		"/:id/schedule/:sessionId/accept",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await acceptSessionHandler(
				params.id,
				params.sessionId,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Session introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Participation confirmée" };
		},
		{
			params: t.Object({ id: t.String(), sessionId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Accepter une session",
				description: "Confirmer sa participation à une session",
			},
		},
	)

	/** POST /campaigns/:id/schedule/:sessionId/complete - Marquer une session comme terminée */
	.post(
		"/:id/schedule/:sessionId/complete",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await completeSessionHandler(
				params.id,
				params.sessionId,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Session introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Session marquée comme terminée",
			};
		},
		{
			params: t.Object({ id: t.String(), sessionId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Terminer une session",
				description: "Marquer une session comme terminée",
			},
		},
	)

	/** POST /campaigns/:id/schedule/:sessionId/cancel - Annuler une session */
	.post(
		"/:id/schedule/:sessionId/cancel",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await cancelSessionHandler(
				params.id,
				params.sessionId,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Session introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Session annulée" };
		},
		{
			params: t.Object({ id: t.String(), sessionId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Annuler une session",
				description: "Annuler une session planifiée",
			},
		},
	)

	// ==================== ROLES ====================

	/** PUT /campaigns/:id/promote/:userId - Promouvoir en admin */
	.put(
		"/:id/promote/:userId",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await promoteMemberHandler(
				params.id,
				sessionResult.user.id,
				params.userId,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Membre promu au rôle d'admin",
			};
		},
		{
			params: t.Object({ id: t.String(), userId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Promouvoir un membre",
				description: "Promouvoir un membre au rôle d'admin",
			},
		},
	)

	/** PUT /campaigns/:id/demote/:userId - Rétrograder un admin */
	.put(
		"/:id/demote/:userId",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await demoteMemberHandler(
				params.id,
				sessionResult.user.id,
				params.userId,
			);
			if (!result.success) {
				set.status = result.error === "Campagne introuvable" ? 404 : 403;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Admin rétrogradé au rôle de membre",
			};
		},
		{
			params: t.Object({ id: t.String(), userId: t.String() }),
			response: {
				200: SuccessMessageResponse,
				401: ErrorResponse,
				403: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Rétrograder un admin",
				description: "Rétrograder un admin au rôle de membre",
			},
		},
	)

	// ==================== INVITATIONS ====================

	/** PUT /campaigns/:id/accept - Accepter une invitation */
	.put(
		"/:id/accept",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await acceptInvitationHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Invitation introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message: "Invitation acceptée, vous êtes maintenant membre",
			};
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Accepter une invitation",
				description: "Accepter une invitation à rejoindre une campagne",
			},
		},
	)

	/** PUT /campaigns/:id/refuse - Refuser une invitation */
	.put(
		"/:id/refuse",
		async ({ set, request, params }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await refuseInvitationHandler(
				params.id,
				sessionResult.user.id,
			);
			if (!result.success) {
				set.status = result.error === "Invitation introuvable" ? 404 : 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Invitation refusée" };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: SuccessMessageResponse,
				400: ErrorResponse,
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Campaigns"],
				summary: "Refuser une invitation",
				description: "Refuser une invitation à rejoindre une campagne",
			},
		},
	);
