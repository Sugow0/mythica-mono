import { GameplayApiClient } from "../api-client-gameplay";
import type { paths } from "../generated/gameplay";
import { ApiError, type ApiErrorResponse } from "../types";

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

/** Une sélection de build résolue (race, classe, sous-classe, sort...). */
export type CharacterSheetSelection =
	CharacterSheetDetail["selections"][number];

/** Type d'une propriété de fiche (enum PropertyType). */
export type CharacterPropertyType = CharacterSheetField["type"];

/** Une étape du parcours de création (kind + config). */
export type CreationStep =
	paths["/game-systems/{id}/creation-flow"]["get"]["responses"][200]["content"]["application/json"]["steps"][number];

/** Une entrée de contenu d'une collection (race, classe, sort...). */
export type ContentItem =
	paths["/game-systems/{id}/content/{collectionKey}"]["get"]["responses"][200]["content"]["application/json"]["items"][number];

/** Corps de finalisation du build (résultat du wizard). */
export type BuildCharacterData =
	paths["/character-sheets/{id}/build"]["post"]["requestBody"]["content"]["application/json"];

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

	/** Parcours de création (étapes data-driven) d'un système de jeu. */
	async getCreationFlow(gameSystemId: string) {
		const { data, error } = await this.client.GET(
			"/game-systems/{id}/creation-flow",
			{ params: { path: { id: gameSystemId } } }
		);
		if (error) throw error;
		return data;
	}

	/** Contenu d'une collection d'un système (race, classe, sort...). */
	async getContent(gameSystemId: string, collectionKey: string) {
		const { data, error } = await this.client.GET(
			"/game-systems/{id}/content/{collectionKey}",
			{ params: { path: { id: gameSystemId, collectionKey } } }
		);
		if (error) throw error;
		return data;
	}

	/** Finaliser le build d'une fiche (résultat du wizard). */
	async finalizeBuild(id: string, body: BuildCharacterData) {
		const { data, error } = await this.client.POST(
			"/character-sheets/{id}/build",
			{ params: { path: { id } }, body }
		);
		if (error) throw error;
		return data;
	}

	/** Supprimer une fiche de personnage (soft delete). */
	async deleteCharacterSheet(id: string) {
		const { data, error } = await this.client.DELETE("/character-sheets/{id}", {
			params: { path: { id } },
		});
		if (error) throw error;
		return data;
	}

	/**
	 * Téléverser l'avatar (token) d'une fiche. Le token est recadré côté client ;
	 * `file` est l'image finale. Retourne l'id de fichier et une URL d'affichage.
	 */
	async uploadAvatar(id: string, file: File | Blob) {
		const formData = new FormData();
		formData.set("avatar", file, "avatar.png");
		const res = await fetch(`${this.baseUrl}/character-sheets/${id}/avatar`, {
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
				body?.error ?? `Échec de l'upload (${res.status})`,
				res.status,
				body
			);
		}
		return (await res.json()) as {
			success: true;
			fileId: string;
			avatarUrl: string | null;
		};
	}
}

/** Singleton du service fiches de personnage. */
export const characterService = new CharacterService();
