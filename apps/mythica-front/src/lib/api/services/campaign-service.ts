import { GameplayApiClient } from "../api-client-gameplay";
import type { paths } from "../generated/gameplay";

export interface CreateCampaignData {
	nom: string;
	gameSystemId: string;
	description?: string;
	isPublic?: boolean;
}

export interface UpdateCampaignData {
	nom?: string;
	description?: string;
	isPublic?: boolean;
	status?: "active" | "paused" | "archived";
}

export type MemberRole = "gm" | "player" | "spectator";

export interface ScheduleSessionData {
	nom: string;
	scheduledAt?: string;
}

export interface UpdateSessionData {
	nom?: string;
	status?: "scheduled" | "active" | "paused" | "ended";
	scheduledAt?: string;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
	search?: string;
}

/**
 * Campaign Service — service gameplay.
 * Gère les campagnes, leurs membres et leurs sessions.
 */
export class CampaignService extends GameplayApiClient {
	private client;

	constructor(baseUrl?: string) {
		const apiUrl = (
			import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"
		).replace(/\/+$/, "");
		super(baseUrl ?? `${apiUrl}/gameplay`);
		this.client = this.createClient<paths>();
	}

	// ==================== Campagnes ====================

	/** Liste paginée des campagnes publiques. */
	async getCampaigns(params?: PaginationParams) {
		const { data, error } = await this.client.GET("/campaigns/", {
			params: { query: params },
		});
		if (error) throw error;
		return data;
	}

	/** Recherche de campagnes publiques par nom. */
	async searchCampaigns(search: string, params?: PaginationParams) {
		const { data, error } = await this.client.GET("/campaigns/", {
			params: { query: { search, ...params } },
		});
		if (error) throw error;
		return data;
	}

	/** Campagnes dont l'utilisateur courant est membre ou propriétaire. */
	async getMyCampaigns() {
		const { data, error } = await this.client.GET("/campaigns/mine", {});
		if (error) throw error;
		return data;
	}

	/** Détails d'une campagne (avec ses membres). */
	async getCampaignById(id: string) {
		const { data, error } = await this.client.GET("/campaigns/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Créer une campagne (l'auteur devient MJ). */
	async createCampaign(body: CreateCampaignData) {
		const { data, error } = await this.client.POST("/campaigns/", { body });
		if (error) throw error;
		return data;
	}

	/** Modifier une campagne (propriétaire). */
	async updateCampaign(id: string, body: UpdateCampaignData) {
		const { data, error } = await this.client.PATCH("/campaigns/{id}", {
			params: { path: { id } },
			body,
		});
		if (error) throw error;
		return data;
	}

	/** Supprimer une campagne (propriétaire, soft delete). */
	async deleteCampaign(id: string) {
		const { data, error } = await this.client.DELETE("/campaigns/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	// ==================== Membres ====================

	/** Rejoindre une campagne publique. */
	async join(id: string) {
		const { data, error } = await this.client.POST("/campaigns/{id}/join", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Quitter une campagne. */
	async leave(id: string) {
		const { data, error } = await this.client.DELETE("/campaigns/{id}/leave", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Changer le rôle d'un membre (propriétaire). */
	async setMemberRole(id: string, userId: string, role: MemberRole) {
		const { data, error } = await this.client.PUT(
			"/campaigns/{id}/members/{userId}/role",
			{ params: { path: { id, userId } }, body: { role } }
		);
		if (error) throw error;
		return data;
	}

	/** Expulser un membre (propriétaire). */
	async kickMember(id: string, userId: string) {
		const { data, error } = await this.client.DELETE(
			"/campaigns/{id}/members/{userId}",
			{ params: { path: { id, userId } } }
		);
		if (error) throw error;
		return data;
	}

	// ==================== Sessions ====================

	/** Liste des sessions d'une campagne (membre). */
	async getSessions(id: string) {
		const { data, error } = await this.client.GET("/campaigns/{id}/sessions", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Créer une session (MJ/propriétaire). */
	async createSession(id: string, body: ScheduleSessionData) {
		const { data, error } = await this.client.POST("/campaigns/{id}/sessions", {
			params: { path: { id } },
			body,
		});
		if (error) throw error;
		return data;
	}

	/** Modifier une session (MJ/propriétaire). */
	async updateSession(id: string, sessionId: string, body: UpdateSessionData) {
		const { data, error } = await this.client.PUT(
			"/campaigns/{id}/sessions/{sessionId}",
			{ params: { path: { id, sessionId } }, body }
		);
		if (error) throw error;
		return data;
	}

	/** Supprimer une session (MJ/propriétaire). */
	async deleteSession(id: string, sessionId: string) {
		const { data, error } = await this.client.DELETE(
			"/campaigns/{id}/sessions/{sessionId}",
			{ params: { path: { id, sessionId } } }
		);
		if (error) throw error;
		return data;
	}

	// ==================== Invitations ====================

	/** Créer un lien d'invitation (MJ/propriétaire). Retourne le token. */
	async createInvite(id: string) {
		const { data, error } = await this.client.POST("/campaigns/{id}/invites", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Prévisualiser une invitation à partir de son token (sans rejoindre). */
	async getInvite(token: string) {
		const { data, error } = await this.client.GET(
			"/campaigns/invites/{token}",
			{ params: { path: { token } } }
		);
		if (error) throw error;
		return data;
	}

	/** Rejoindre une campagne via un token d'invitation. */
	async acceptInvite(token: string) {
		const { data, error } = await this.client.POST(
			"/campaigns/invites/{token}/accept",
			{ params: { path: { token } } }
		);
		if (error) throw error;
		return data;
	}
}

/** Singleton du service campagnes. */
export const campaignService = new CampaignService();
