import createClient, { type Client, type Middleware } from "openapi-fetch";
import { ApiError, type ApiErrorResponse } from "./types";

/**
 * Base API client configuration and utilities.
 * Extended by domain-specific clients (Platform, Gameplay).
 */
export class ApiClient {
	protected readonly baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	/**
	 * Create a typed openapi-fetch client for a specific API schema.
	 * Applies common middleware for auth and error handling.
	 */
	protected createClient<Paths extends object>(): Client<Paths> {
		const client = createClient<Paths>({
			baseUrl: this.baseUrl,
		});

		// Apply middleware
		client.use(this.authMiddleware());
		client.use(this.errorMiddleware());

		return client;
	}

	/**
	 * Middleware to include credentials (cookies) with every request.
	 * Required for httpOnly cookie-based authentication.
	 */
	private authMiddleware(): Middleware {
		return {
			async onRequest({ request }) {
				// Ensure cookies are sent with requests. On clone la Request
				// existante (en la passant en 1er argument) pour préserver method,
				// headers et body — un spread `{...request}` les perdrait (ce sont
				// des accesseurs du prototype), transformant tout POST/PUT en GET.
				return new Request(request, { credentials: "include" });
			},
		};
	}

	/**
	 * Middleware to handle and normalize errors.
	 * Throws ApiError for non-2xx responses.
	 */
	private errorMiddleware(): Middleware {
		return {
			async onResponse({ response }) {
				// Let successful responses pass through
				if (response.ok) {
					return response;
				}

				// Handle redirects (302) - these are expected for OAuth flows
				if (response.status === 302) {
					return response;
				}

				// Try to parse error response body
				let errorBody: ApiErrorResponse | undefined;
				try {
					const clonedResponse = response.clone();
					errorBody = await clonedResponse.json();
				} catch {
					// Response body is not JSON
				}

				const errorMessage =
					errorBody?.error ?? `Request failed with status ${response.status}`;

				throw new ApiError(errorMessage, response.status, errorBody);
			},
		};
	}

	/**
	 * Extract error message from an unknown error.
	 * Useful for catch blocks in API methods.
	 */
	protected getErrorMessage(error: unknown): string {
		if (error instanceof ApiError) {
			return error.message;
		}
		if (error instanceof Error) {
			return error.message;
		}
		return "An unexpected error occurred";
	}
}
