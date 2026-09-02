import { GameplayApiClient } from "../api-client-gameplay";
import type { paths } from "../generated/gameplay";

export class EncountersService extends GameplayApiClient {
	private client;

	constructor(baseUrl?: string) {
		const apiUrl = (
			import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"
		).replace(/\/+$/, "");
		super(baseUrl ?? `${apiUrl}/gameplay`);
		this.client = this.createClient<paths>();
	}

	async getEncounters(campaignId: string) {
		const { data, error } = await this.client.GET(
			"/campaigns/{id}/encounters",
			{
				params: { path: { id: campaignId } },
			}
		);
		if (error) throw error;
		return data;
	}

	async createEncounter(
		campaignId: string,
		body: { nom: string; difficulty?: string }
	) {
		const { data, error } = await this.client.POST(
			"/campaigns/{id}/encounters",
			{
				params: { path: { id: campaignId } },
				body,
			}
		);
		if (error) throw error;
		return data;
	}

	async deleteEncounter(campaignId: string, encounterId: string) {
		const { data, error } = await this.client.DELETE(
			"/campaigns/{id}/encounters/{encounterId}",
			{
				params: { path: { id: campaignId, encounterId } },
			}
		);
		if (error) throw error;
		return data;
	}

	async addMonster(
		campaignId: string,
		encounterId: string,
		body: { characterSheetId: string; quantity?: number }
	) {
		const { data, error } = await this.client.POST(
			"/campaigns/{id}/encounters/{encounterId}/monsters",
			{
				params: { path: { id: campaignId, encounterId } },
				body,
			}
		);
		if (error) throw error;
		return data;
	}

	async removeMonster(
		campaignId: string,
		encounterId: string,
		monsterId: string
	) {
		const { data, error } = await this.client.DELETE(
			"/campaigns/{id}/encounters/{encounterId}/monsters/{monsterId}",
			{
				params: { path: { id: campaignId, encounterId, monsterId } },
			}
		);
		if (error) throw error;
		return data;
	}
}

export const encountersService = new EncountersService();
