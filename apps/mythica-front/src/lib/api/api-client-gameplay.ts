import { env } from "$env/dynamic/public";
import { ApiClient } from "./api-client";
// TODO: Generate gameplay types with:
// openapi-typescript <gameplay-api-url>/swagger/json -o ./src/lib/api/generated/gameplay.ts
// Then uncomment: import type { paths } from './generated/gameplay';

/**
 * Gameplay API client for game-related operations.
 * Uses generated types from OpenAPI specification.
 *
 * Note: This client is a placeholder. Once the gameplay API schema is available,
 * generate types using openapi-typescript and implement the methods.
 *
 * Example methods to implement:
 * - Character management (create, update, delete characters)
 * - Dice rolling and actions
 * - Game state management
 * - Chat/messaging during sessions
 * - Asset management (maps, tokens, etc.)
 */
export class GameplayApiClient extends ApiClient {
	// Uncomment when gameplay types are generated:
	// private client;

	constructor(baseUrl?: string) {
		super(
			baseUrl ?? `${env.PUBLIC_API_URL ?? "http://localhost:2100"}/gameplay`
		);

		// Uncomment when gameplay types are generated:
		// this.client = this.createClient<paths>();
	}

	// ============================================
	// Placeholder methods - implement when API is ready
	// ============================================

	/**
	 * Example: Get characters for a campaign
	 */
	// async getCharacters(campaignId: string) {
	//   const { data: response, error } = await this.client.GET('/campaigns/{id}/characters', {
	//     params: { path: { id: campaignId } }
	//   });
	//   if (error) throw error;
	//   return response;
	// }

	/**
	 * Example: Create a new character
	 */
	// async createCharacter(campaignId: string, data: CharacterCreateInput) {
	//   const { data: response, error } = await this.client.POST('/campaigns/{id}/characters', {
	//     params: { path: { id: campaignId } },
	//     body: data
	//   });
	//   if (error) throw error;
	//   return response;
	// }

	/**
	 * Example: Roll dice
	 */
	// async rollDice(data: { notation: string; modifier?: number }) {
	//   const { data: response, error } = await this.client.POST('/dice/roll', {
	//     body: data
	//   });
	//   if (error) throw error;
	//   return response;
	// }
}

/** Singleton instance of the Gameplay API client */
export const gameplayApi = new GameplayApiClient();
