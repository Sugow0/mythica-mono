import { ApiError } from "../types";

export type CampaignSheetStatus = "active" | "inactive" | "disabled";
export type PoolRequestStatus = "pending" | "confirmed" | "rejected";
export type ChangeRequestStatus = "pending" | "approved" | "rejected";

export interface CampaignCharacterSheet {
	id: string;
	characterSheetId: string;
	userId: string;
	name: string;
	avatarFileId: string | null;
	status: CampaignSheetStatus;
}

export interface CampaignPoolSheet {
	id: string;
	characterSheetId: string;
	name: string;
	visibleToPlayers: boolean;
	pendingRequestCount: number;
	alreadyRequested: boolean;
}

export interface CampaignPoolRequest {
	id: string;
	poolSheetId: string;
	requestedByUserId: string;
	status: PoolRequestStatus;
	assignedSheetId: string | null;
	poolSheetName: string;
	createdAt: string;
}

export interface CampaignChangeRequest {
	id: string;
	campaignId: string;
	playerId: string;
	targetSheetId: string;
	targetSheetName: string;
	status: ChangeRequestStatus;
	createdAt: string;
}

function gameplayUrl(): string {
	return (
		import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"
	).replace(/\/+$/, "");
}

async function gfetch<T>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const res = await fetch(`${gameplayUrl()}/gameplay${path}`, {
		method,
		credentials: "include",
		headers:
			body !== undefined ? { "Content-Type": "application/json" } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	const json = await res.json().catch(() => null);
	if (!res.ok) {
		throw new ApiError(
			(json as { error?: string })?.error ?? "Erreur inconnue",
			res.status
		);
	}
	return json as T;
}

export class CampaignCharacterSheetsService {
	// ==================== Lecture ====================

	/** Lister les fiches liées à la campagne (FEAT-179). */
	async getCampaignSheets(
		campaignId: string
	): Promise<CampaignCharacterSheet[]> {
		const data = await gfetch<{ sheets: CampaignCharacterSheet[] }>(
			"GET",
			`/campaigns/${campaignId}/character-sheets`
		);
		return data.sheets;
	}

	// ==================== Fiches joueur ====================

	/** Importer un master existant dans la campagne (snapshot). */
	async importSheet(
		campaignId: string,
		sourceSheetId: string
	): Promise<{ id: string; characterSheetId: string }> {
		return gfetch("POST", `/campaigns/${campaignId}/character-sheets/import`, {
			sourceSheetId,
		});
	}

	/** Lier un master nouvellement créé via le wizard. */
	async createSheetSnapshot(
		campaignId: string,
		characterSheetId: string
	): Promise<{ id: string; characterSheetId: string }> {
		return gfetch("POST", `/campaigns/${campaignId}/character-sheets/create`, {
			characterSheetId,
		});
	}

	/** Activer une fiche inactive (joueur sans fiche active, campagne non verrouillée). */
	async activateSheet(
		campaignId: string,
		campaignSheetId: string
	): Promise<void> {
		await gfetch(
			"POST",
			`/campaigns/${campaignId}/character-sheets/${campaignSheetId}/activate`
		);
	}

	/** Demander un changement de personnage actif. */
	async requestCharacterChange(
		campaignId: string,
		targetCampaignSheetId: string
	): Promise<{ id: string }> {
		return gfetch(
			"POST",
			`/campaigns/${campaignId}/character-sheets/change-request`,
			{ targetCampaignSheetId }
		);
	}

	// ==================== Gestion MJ — cycle de vie ====================

	/** Désactiver une fiche (mort du personnage). */
	async disableSheet(
		campaignId: string,
		campaignSheetId: string
	): Promise<void> {
		await gfetch(
			"PATCH",
			`/campaigns/${campaignId}/character-sheets/${campaignSheetId}/disable`
		);
	}

	/** Réactiver une fiche disabled (→ inactive). */
	async reactivateSheet(
		campaignId: string,
		campaignSheetId: string
	): Promise<void> {
		await gfetch(
			"PATCH",
			`/campaigns/${campaignId}/character-sheets/${campaignSheetId}/reactivate`
		);
	}

	/** Modifier les paramètres de la campagne (verrouillage création). */
	async updateSettings(
		campaignId: string,
		characterCreationLocked: boolean
	): Promise<void> {
		await gfetch("PATCH", `/campaigns/${campaignId}/settings`, {
			characterCreationLocked,
		});
	}

	/** Lister les demandes de changement en attente (MJ). */
	async getChangeRequests(
		campaignId: string
	): Promise<CampaignChangeRequest[]> {
		const data = await gfetch<{ requests: CampaignChangeRequest[] }>(
			"GET",
			`/campaigns/${campaignId}/character-sheets/change-requests`
		);
		return data.requests;
	}

	/** Approuver une demande de changement. */
	async approveChangeRequest(
		campaignId: string,
		requestId: string
	): Promise<void> {
		await gfetch(
			"POST",
			`/campaigns/${campaignId}/character-sheets/change-requests/${requestId}/approve`
		);
	}

	/** Rejeter une demande de changement. */
	async rejectChangeRequest(
		campaignId: string,
		requestId: string
	): Promise<void> {
		await gfetch(
			"POST",
			`/campaigns/${campaignId}/character-sheets/change-requests/${requestId}/reject`
		);
	}

	// ==================== Pool MJ ====================

	/** Importer un master dans le pool MJ. */
	async importToPool(
		campaignId: string,
		sourceSheetId: string
	): Promise<{ id: string }> {
		return gfetch("POST", `/campaigns/${campaignId}/pool/import`, {
			sourceSheetId,
		});
	}

	/** Lister les fiches du pool. */
	async getPool(campaignId: string): Promise<CampaignPoolSheet[]> {
		const data = await gfetch<{ sheets: CampaignPoolSheet[] }>(
			"GET",
			`/campaigns/${campaignId}/pool`
		);
		return data.sheets;
	}

	/** Modifier la visibilité d'une fiche du pool. */
	async setPoolSheetVisibility(
		campaignId: string,
		poolSheetId: string,
		visibleToPlayers: boolean
	): Promise<void> {
		await gfetch(
			"PATCH",
			`/campaigns/${campaignId}/pool/${poolSheetId}/visibility`,
			{ visibleToPlayers }
		);
	}

	/** Retirer une fiche du pool. */
	async deletePoolSheet(
		campaignId: string,
		poolSheetId: string
	): Promise<void> {
		await gfetch("DELETE", `/campaigns/${campaignId}/pool/${poolSheetId}`);
	}

	// ==================== Attribution pool ====================

	/** Demander une fiche du pool. */
	async requestPoolSheet(
		campaignId: string,
		poolSheetId: string
	): Promise<{ id: string }> {
		return gfetch(
			"POST",
			`/campaigns/${campaignId}/pool/${poolSheetId}/request`
		);
	}

	/** Lister les demandes de fiche du pool (MJ). */
	async getPoolRequests(campaignId: string): Promise<CampaignPoolRequest[]> {
		const data = await gfetch<{ requests: CampaignPoolRequest[] }>(
			"GET",
			`/campaigns/${campaignId}/pool/requests`
		);
		return data.requests;
	}

	/** Confirmer une attribution de fiche du pool. */
	async confirmPoolRequest(
		campaignId: string,
		poolSheetId: string,
		requestId: string
	): Promise<void> {
		await gfetch(
			"POST",
			`/campaigns/${campaignId}/pool/${poolSheetId}/requests/${requestId}/confirm`
		);
	}

	/** Rejeter une demande de fiche du pool. */
	async rejectPoolRequest(
		campaignId: string,
		poolSheetId: string,
		requestId: string
	): Promise<void> {
		await gfetch(
			"POST",
			`/campaigns/${campaignId}/pool/${poolSheetId}/requests/${requestId}/reject`
		);
	}
}

export const campaignCharacterSheetsService =
	new CampaignCharacterSheetsService();
