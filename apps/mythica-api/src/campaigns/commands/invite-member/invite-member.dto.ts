/** DTO et validation pour l'invitation à une campagne */
import { type Static, t } from "elysia";
import { ErrorResponse } from "../../../lib/schemas";

// ==================== SCHÉMA REQUEST ====================

export const InviteMemberBodySchema = t.Object({
	userId: t.String({
		minLength: 1,
		description: "ID de l'utilisateur à inviter",
	}),
});

export type InviteMemberBody = Static<typeof InviteMemberBodySchema>;

// ==================== SCHÉMA RESPONSE ====================

export const InviteMemberResponse = t.Object({
	success: t.Literal(true),
	invitationId: t.String({ description: "ID de l'invitation créée" }),
	message: t.String({ description: "Message de confirmation" }),
});

export type InviteMemberResponseType = Static<typeof InviteMemberResponse>;

// ==================== SCHÉMAS ROUTE ====================

export const inviteMemberRouteSchema = {
	body: InviteMemberBodySchema,
	response: {
		201: InviteMemberResponse,
		400: ErrorResponse,
		401: ErrorResponse,
		403: ErrorResponse,
		404: ErrorResponse,
	},
	detail: {
		tags: ["Campaigns"],
		summary: "Inviter un membre",
		description: "Invite un utilisateur à rejoindre une campagne",
	},
};
