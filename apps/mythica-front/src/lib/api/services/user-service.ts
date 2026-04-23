import { ApiClient } from "../api-client";
import type { paths } from "../generated/platform";

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
				`${import.meta.env.PUBLIC_API_URL ?? "http://localhost:2100"}/api`
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
}

/** Singleton instance of the User Service */
export const userService = new UserService();
