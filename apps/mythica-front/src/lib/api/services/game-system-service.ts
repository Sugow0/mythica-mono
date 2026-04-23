import { ApiClient } from "../api-client";
import type { paths } from "../generated/platform";

export interface CreateGameSystemData {
	name: string;
	description?: string;
}

export interface UpdateGameSystemData {
	name?: string;
	description?: string;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
}

/**
 * Game System Service
 * Handles all game-system-related API calls including:
 * - Game system CRUD operations (admin only for create/update/delete)
 * - Game system version management (add, update, delete)
 */
export class GameSystemService extends ApiClient {
	private client;

	constructor(baseUrl?: string) {
		super(
			baseUrl ??
				`${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`
		);
		this.client = this.createClient<paths>();
	}

	// ============================================
	// Game Systems - CRUD
	// ============================================

	/**
	 * List all game systems (paginated).
	 */
	async getGameSystems(params?: PaginationParams) {
		const { data: response, error } = await this.client.GET("/game-systems/", {
			params: { query: params },
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Get a game system by ID.
	 */
	async getGameSystemById(id: string) {
		const { data: response, error } = await this.client.GET(
			"/game-systems/{id}",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Create a new game system (admin only).
	 */
	async createGameSystem(data: CreateGameSystemData) {
		const { data: response, error } = await this.client.POST("/game-systems/", {
			body: data,
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Update a game system (admin only).
	 */
	async updateGameSystem(id: string, data: UpdateGameSystemData) {
		const { data: response, error } = await this.client.PUT(
			"/game-systems/{id}",
			{
				params: { path: { id } },
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Delete a game system (admin only).
	 * Fails if the game system is used by campaigns.
	 */
	async deleteGameSystem(id: string) {
		const { data: response, error } = await this.client.DELETE(
			"/game-systems/{id}",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	// ============================================
	// Game System Versions
	// ============================================

	/**
	 * Add a version to a game system (admin only).
	 */
	async addVersion(gameSystemId: string, version: string) {
		const { data: response, error } = await this.client.POST(
			"/game-systems/{id}/versions",
			{
				params: { path: { id: gameSystemId } },
				body: { version },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Update a game system version (admin only).
	 */
	async updateVersion(
		gameSystemId: string,
		versionId: string,
		version: string
	) {
		const { data: response, error } = await this.client.PUT(
			"/game-systems/{id}/versions/{versionId}",
			{
				params: { path: { id: gameSystemId, versionId } },
				body: { version },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Delete a game system version (admin only).
	 */
	async deleteVersion(gameSystemId: string, versionId: string) {
		const { data: response, error } = await this.client.DELETE(
			"/game-systems/{id}/versions/{versionId}",
			{
				params: { path: { id: gameSystemId, versionId } },
			}
		);

		if (error) throw error;
		return response;
	}
}

/** Singleton instance of the Game System Service */
export const gameSystemService = new GameSystemService();
