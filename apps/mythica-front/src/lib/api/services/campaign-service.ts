import { ApiClient } from "../api-client";
import type { paths } from "../generated/platform";

/**
 * Campaign data types
 */
export interface CreateCampaignData {
	name: string;
	description?: string;
	visibility?: "PUBLIC" | "PRIVATE";
	gameSystemId: string;
}

export interface UpdateCampaignData {
	name?: string;
	description?: string;
	visibility?: "PUBLIC" | "PRIVATE";
}

export interface ScheduleSessionData {
	title: string;
	description?: string;
	scheduledAt: string;
	duration: number;
}

export interface UpdateSessionData {
	title?: string;
	description?: string;
	scheduledAt?: string;
	duration?: number;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
}

/**
 * Campaign Service
 * Handles all campaign-related API calls including:
 * - Campaign CRUD operations
 * - Membership management (invite, join, leave, kick)
 * - Campaign administration (archive, promote, demote)
 * - Session scheduling and management
 */
export class CampaignService extends ApiClient {
	private client;

	constructor(baseUrl?: string) {
		super(
			baseUrl ??
				`${import.meta.env.PUBLIC_API_URL ?? "http://localhost:2100"}/api`
		);
		this.client = this.createClient<paths>();
	}

	// ============================================
	// Campaigns - CRUD
	// ============================================

	/**
	 * List public campaigns.
	 */
	async getCampaigns(params?: PaginationParams) {
		const { data: response, error } = await this.client.GET("/campaigns/", {
			params: { query: params },
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Get campaigns the current user is part of.
	 */
	async getMyCampaigns(params?: PaginationParams) {
		const { data: response, error } = await this.client.GET("/campaigns/my", {
			params: { query: params },
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Get archived campaigns.
	 */
	async getArchivedCampaigns(params?: PaginationParams) {
		const { data: response, error } = await this.client.GET(
			"/campaigns/archived",
			{
				params: { query: params },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Search campaigns by name.
	 */
	async searchCampaigns(search: string, params?: PaginationParams) {
		const { data: response, error } = await this.client.GET(
			"/campaigns/search",
			{
				params: { query: { search, ...params } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Get a campaign by ID.
	 */
	async getCampaignById(id: string) {
		const { data: response, error } = await this.client.GET("/campaigns/{id}", {
			params: { path: { id } },
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Create a new campaign.
	 */
	async createCampaign(data: CreateCampaignData) {
		const { data: response, error } = await this.client.POST("/campaigns/", {
			body: data,
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Update a campaign.
	 */
	async updateCampaign(id: string, data: UpdateCampaignData) {
		const { data: response, error } = await this.client.PUT("/campaigns/{id}", {
			params: { path: { id } },
			body: data,
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Delete a campaign.
	 */
	async deleteCampaign(id: string) {
		const { data: response, error } = await this.client.DELETE(
			"/campaigns/{id}",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	// ============================================
	// Campaigns - Membership
	// ============================================

	/**
	 * Invite a user to a campaign.
	 */
	async inviteUser(campaignId: string, userId: string) {
		const { data: response, error } = await this.client.POST(
			"/campaigns/{id}/invite",
			{
				params: { path: { id: campaignId } },
				body: { userId },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Join a public campaign.
	 */
	async join(id: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/join",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Leave a campaign.
	 */
	async leave(id: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/leave",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Kick a user from a campaign.
	 */
	async kickUser(campaignId: string, userId: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/kick/{userId}",
			{
				params: { path: { id: campaignId, userId } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Accept a campaign invitation (for pending invites).
	 */
	async acceptInvite(id: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/accept",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	// ============================================
	// Campaigns - Management
	// ============================================

	/**
	 * Archive a campaign.
	 */
	async archive(id: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/archive",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Promote a member to GM.
	 */
	async promoteMember(campaignId: string, userId: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/promote/{userId}",
			{
				params: { path: { id: campaignId, userId } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Demote a GM to member.
	 */
	async demoteMember(campaignId: string, userId: string) {
		const { data: response, error } = await this.client.PUT(
			"/campaigns/{id}/demote/{userId}",
			{
				params: { path: { id: campaignId, userId } },
			}
		);

		if (error) throw error;
		return response;
	}

	// ============================================
	// Campaigns - Sessions
	// ============================================

	/**
	 * Schedule a new session for a campaign.
	 */
	async scheduleSession(campaignId: string, data: ScheduleSessionData) {
		const { data: response, error } = await this.client.POST(
			"/campaigns/{id}/schedule",
			{
				params: { path: { id: campaignId } },
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Update a scheduled session.
	 */
	async updateSession(
		campaignId: string,
		sessionId: string,
		data: UpdateSessionData
	) {
		const { data: response, error } = await this.client.POST(
			"/campaigns/{id}/schedule/{sessionId}",
			{
				params: { path: { id: campaignId, sessionId } },
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Accept a session invitation.
	 */
	async acceptSession(campaignId: string, sessionId: string) {
		const { data: response, error } = await this.client.POST(
			"/campaigns/{id}/schedule/{sessionId}/accept",
			{
				params: { path: { id: campaignId, sessionId } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Mark a session as completed.
	 */
	async completeSession(campaignId: string, sessionId: string) {
		const { data: response, error } = await this.client.POST(
			"/campaigns/{id}/schedule/{sessionId}/complete",
			{
				params: { path: { id: campaignId, sessionId } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Cancel a scheduled session.
	 */
	async cancelSession(campaignId: string, sessionId: string) {
		const { data: response, error } = await this.client.POST(
			"/campaigns/{id}/schedule/{sessionId}/cancel",
			{
				params: { path: { id: campaignId, sessionId } },
			}
		);

		if (error) throw error;
		return response;
	}
}

/** Singleton instance of the Campaign Service */
export const campaignService = new CampaignService();
