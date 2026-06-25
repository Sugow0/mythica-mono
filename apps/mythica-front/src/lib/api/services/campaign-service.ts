import { GameplayApiClient } from "../api-client-gameplay";
import type { paths } from "../generated/gameplay";
import { ApiError, type ApiErrorResponse } from "../types";

export interface CreateCampaignData {
	nom: string;
	gameSystemId: string;
	description?: string;
	isPublic?: boolean;
	tags?: string[];
}

export interface UpdateCampaignData {
	nom?: string;
	description?: string;
	isPublic?: boolean;
	status?: "active" | "paused" | "archived";
	tags?: string[];
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

	/**
	 * Téléverser l'image de couverture d'une campagne (propriétaire).
	 * Retourne l'identifiant du fichier et une URL présignée d'affichage.
	 */
	async uploadCoverImage(campaignId: string, file: File) {
		const formData = new FormData();
		formData.set("cover", file);
		const res = await fetch(`${this.baseUrl}/campaigns/${campaignId}/cover`, {
			method: "POST",
			credentials: "include",
			body: formData,
		});
		if (!res.ok) {
			let body: ApiErrorResponse | undefined;
			try {
				body = await res.clone().json();
			} catch {
				// réponse non-JSON
			}
			throw new ApiError(
				body?.error ?? `Echec de l'upload (${res.status})`,
				res.status,
				body
			);
		}
		return (await res.json()) as {
			success: true;
			fileId: string;
			coverUrl: string | null;
		};
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

	// ==================== Chat ====================

	/** Historique récent du chat d'une campagne (membre). */
	async getMessages(id: string) {
		const { data, error } = await this.client.GET("/campaigns/{id}/messages", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Envoyer un message dans le chat d'une campagne (membre). */
	async postMessage(id: string, content: string) {
		const { data, error } = await this.client.POST("/campaigns/{id}/messages", {
			params: { path: { id } },
			body: { content },
		});
		if (error) throw error;
		return data;
	}

	/** URL du flux SSE temps réel du chat (à consommer via EventSource). */
	messagesStreamUrl(id: string): string {
		return `${this.baseUrl}/campaigns/${id}/messages/stream`;
	}

	// ==================== Demandes d'accès ====================

	/** Demander l'accès à une campagne publique (validée par le MJ). */
	async requestJoin(id: string) {
		const { data, error } = await this.client.POST("/campaigns/{id}/join", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Demandes d'accès en attente (MJ). */
	async getJoinRequests(id: string) {
		const { data, error } = await this.client.GET(
			"/campaigns/{id}/join-requests",
			{ params: { path: { id } } }
		);
		if (error) throw error;
		return data;
	}

	/** Accepter une demande d'accès (MJ). */
	async acceptJoinRequest(id: string, requestId: string) {
		const { data, error } = await this.client.POST(
			"/campaigns/{id}/join-requests/{requestId}/accept",
			{ params: { path: { id, requestId } } }
		);
		if (error) throw error;
		return data;
	}

	/** Refuser une demande d'accès (MJ). */
	async declineJoinRequest(id: string, requestId: string) {
		const { data, error } = await this.client.POST(
			"/campaigns/{id}/join-requests/{requestId}/decline",
			{ params: { path: { id, requestId } } }
		);
		if (error) throw error;
		return data;
	}

	// ==================== Membres ====================

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

	// ==================== Sessions ====================

	/** Détail d'une session par son id (membre de la campagne). */
	async getSession(sessionId: string) {
		const { data, error } = await this.client.GET("/sessions/{id}", {
			params: { path: { id: sessionId } },
		});
		if (error) throw error;
		return data;
	}

	/** Lancer une session depuis la salle d'attente (MJ/propriétaire). */
	async launchSession(sessionId: string) {
		const { data, error } = await this.client.POST("/sessions/{id}/launch", {
			params: { path: { id: sessionId } },
		});
		if (error) throw error;
		return data;
	}

	/** Créer un token dans une session (MJ). */
	async createToken(
		sessionId: string,
		data: {
			label?: string;
			posX?: number;
			posY?: number;
			layer?: "background" | "object" | "token" | "gm";
		}
	) {
		const { data: result, error } = await this.client.POST(
			"/sessions/{id}/tokens",
			{
				params: { path: { id: sessionId } },
				body: { posX: data.posX ?? 0, posY: data.posY ?? 0, ...data },
			}
		);
		if (error) throw error;
		return result;
	}

	/** URL du flux SSE de présence d'une session (à consommer via EventSource). */
	presenceStreamUrl(sessionId: string): string {
		return `${this.baseUrl}/sessions/${sessionId}/presence/stream`;
	}

	/** URL du WebSocket temps réel d'une session (à consommer via WebSocket). */
	sessionSocketUrl(sessionId: string): string {
		const socketBase = (
			import.meta.env.VITE_PUBLIC_SOCKET_API_URL ?? "ws://localhost:2150"
		).replace(/\/+$/, "");
		return `${socketBase}/gameplay/sessions/${sessionId}/ws`;
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
