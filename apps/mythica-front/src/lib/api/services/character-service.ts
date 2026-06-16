import { GameplayApiClient } from "../api-client-gameplay";
import type { paths } from "../generated/gameplay";

/** Corps de création d'une fiche de personnage. */
export type CreateCharacterSheetData =
	paths["/character-sheets/"]["post"]["requestBody"]["content"]["application/json"];

/** Une valeur à enregistrer (auto-save). */
export type CharacterSheetValueUpdate =
	paths["/character-sheets/{id}/values"]["patch"]["requestBody"]["content"]["application/json"][number];

/** Filtres de la liste « mes fiches ». */
export type ListCharacterSheetsParams =
	paths["/character-sheets/"]["get"]["parameters"]["query"];

/** Une fiche telle que renvoyée par la liste « mes fiches ». */
export type CharacterSheetListItem =
	paths["/character-sheets/"]["get"]["responses"][200]["content"]["application/json"]["items"][number];

/** Détail complet d'une fiche (fiche type fusionnée avec les valeurs). */
export type CharacterSheetDetail =
	paths["/character-sheets/{id}"]["get"]["responses"][200]["content"]["application/json"];

/** Une entrée de fiche assemblée (propriété + valeur courante). */
export type CharacterSheetField = CharacterSheetDetail["properties"][number];

/** Type d'une propriété de fiche (enum PropertyType). */
export type CharacterPropertyType = CharacterSheetField["type"];

/**
 * Character Service — service gameplay.
 * Gère les fiches de personnage standalone de l'utilisateur courant.
 */
export class CharacterService extends GameplayApiClient {
	private client;

	constructor(baseUrl?: string) {
		const apiUrl = (
			import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"
		).replace(/\/+$/, "");
		super(baseUrl ?? `${apiUrl}/gameplay`);
		this.client = this.createClient<paths>();
	}

	/** Liste de mes fiches de personnage (filtre optionnel par système). */
	async getCharacterSheets(params?: ListCharacterSheetsParams) {
		const { data, error } = await this.client.GET("/character-sheets/", {
			params: { query: params },
		});
		if (error) throw error;
		return data;
	}

	/** Détail complet d'une fiche (fiche type fusionnée avec les valeurs). */
	async getCharacterSheetById(id: string) {
		const { data, error } = await this.client.GET("/character-sheets/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/** Créer une fiche de personnage standalone. */
	async createCharacterSheet(body: CreateCharacterSheetData) {
		const { data, error } = await this.client.POST("/character-sheets/", {
			body,
		});
		if (error) throw error;
		return data;
	}

	/** Auto-save d'un lot de valeurs. */
	async updateCharacterSheetValues(
		id: string,
		values: CharacterSheetValueUpdate[]
	) {
		const { data, error } = await this.client.PATCH(
			"/character-sheets/{id}/values",
			{ params: { path: { id } }, body: values }
		);
		if (error) throw error;
		return data;
	}
}

/** Singleton du service fiches de personnage. */
export const characterService = new CharacterService();
