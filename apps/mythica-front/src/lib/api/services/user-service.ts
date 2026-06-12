import { ApiClient } from "../api-client";
import type { paths } from "../generated/platform";
import { ApiError, type ApiErrorResponse } from "../types";

/**
 * User data types
 */
export interface PaginationParams {
	page?: number;
	limit?: number;
}

/**
 * User Service
 * Handles user management API calls including:
 * - Listing users (admin)
 * - Getting user by ID
 */
export class UserService extends ApiClient {
	private client;

	constructor(baseUrl?: string) {
		super(
			baseUrl ??
				`${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`
		);
		this.client = this.createClient<paths>();
	}

	/**
	 * List all users (admin only).
	 */
	async getUsers(params?: PaginationParams) {
		const { data: response, error } = await this.client.GET("/identity/users", {
			params: { query: params },
		});

		if (error) throw error;
		return response;
	}

	/**
	 * Get a user by ID.
	 */
	async getUserById(id: string) {
		const { data: response, error } = await this.client.GET(
			"/identity/users/{id}",
			{
				params: { path: { id } },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Get the current authenticated user's profile.
	 */
	async getMe() {
		const { data: response, error } = await this.client.GET("/identity/me", {});
		if (error) throw error;
		return response;
	}

	/**
	 * Update the current user's profile (pseudo and/or bio).
	 */
	async updateProfile(body: { pseudo?: string; bio?: string | null }) {
		const { data: response, error } = await this.client.PATCH("/identity/me", {
			body,
		});
		if (error) throw error;
		return response;
	}

	/**
	 * Upload a new avatar (multipart). Returns the stored avatar key.
	 * Uses a direct fetch: the endpoint reads multipart form-data and has no
	 * typed request body in the OpenAPI schema.
	 */
	async uploadAvatar(file: File) {
		const formData = new FormData();
		formData.set("avatar", file);
		const res = await fetch(`${this.baseUrl}/identity/me/avatar`, {
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
		return (await res.json()) as { success: true; avatarKey: string };
	}

	/**
	 * Get a presigned URL to display the current user's avatar.
	 */
	async getAvatarUrl() {
		const { data: response, error } = await this.client.GET(
			"/identity/me/avatar-url",
			{}
		);
		if (error) throw error;
		return response;
	}
}

/** Singleton instance of the User Service */
export const userService = new UserService();
