import { GameplayApiClient } from "../api-client-gameplay";
import type { paths } from "../generated/gameplay";

export interface CreateGameSystemData {
	nom: string;
	version: string;
	slug: string;
	description?: string;
	isOfficial?: boolean;
	parentSystemId?: string;
}

export interface UpdateGameSystemData {
	nom?: string;
	version?: string;
	slug?: string;
	description?: string;
	isOfficial?: boolean;
	parentSystemId?: string;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
	search?: string;
}

/**
 * Game System Service — service gameplay.
 * Gère les systèmes de jeu (CRUD, réservé aux administrateurs en écriture).
 */
export class GameSystemService extends GameplayApiClient {
	private client;

	constructor(baseUrl?: string) {
		super(
			baseUrl ??
				`${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay`
		);
		this.client = this.createClient<paths>();
	}

	/** Liste paginée des systèmes de jeu. */
	async getGameSystems(params?: PaginationParams) {
		const { data, error } = await this.client.GET("/game-systems/", {
			params: { query: params },
		});
		if (error) throw error;
		return data;
	}

	/** Détails d'un système de jeu. */
	async getGameSystemById(id: string) {
		const { data, error } = await this.client.GET("/game-systems/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Créer un système de jeu (admin). */
	async createGameSystem(body: CreateGameSystemData) {
		const { data, error } = await this.client.POST("/game-systems/", { body });
		if (error) throw error;
		return data;
	}

	/** Modifier un système de jeu (admin). */
	async updateGameSystem(id: string, body: UpdateGameSystemData) {
		const { data, error } = await this.client.PUT("/game-systems/{id}", {
			params: { path: { id } },
			body,
		});
		if (error) throw error;
		return data;
	}

	/** Supprimer un système de jeu (admin). */
	async deleteGameSystem(id: string) {
		const { data, error } = await this.client.DELETE("/game-systems/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}
}

/** Singleton du service systèmes de jeu. */
export const gameSystemService = new GameSystemService();
