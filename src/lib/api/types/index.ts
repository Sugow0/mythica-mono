/**
 * Common API types and utilities
 */

/** Standard success response shape */
export type ApiSuccessResponse<T = unknown> = {
	success: true;
} & T;

/** Standard error response shape */
export type ApiErrorResponse = {
	success: false;
	error: string;
};

/** Union of success and error responses */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Paginated response wrapper */
export type PaginatedResponse<T> = {
	success: true;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
} & T;

/** User object from API responses */
export type User = {
	id: string;
	firstName: string;
	lastName: string;
	pseudo: string;
	avatar: string | null;
	emailVerified: boolean;
	createdAt: string | number;
	role: "ADMIN" | "USER" | "SUPPORT";
};

/** Login response - either user or 2FA required */
export type LoginResponse =
	| { success: true; user: User }
	| { success: true; requiresTwoFactor: true; tempToken: string };

/** Type guard to check if response is successful */
export function isSuccess<T>(
	response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
	return response.success === true;
}

/** Type guard to check if response is an error */
export function isError(
	response: ApiResponse<unknown>
): response is ApiErrorResponse {
	return response.success === false;
}

/** Type guard to check if login requires 2FA */
export function requiresTwoFactor(
	response: LoginResponse
): response is { success: true; requiresTwoFactor: true; tempToken: string } {
	return (
		response.success === true &&
		"requiresTwoFactor" in response &&
		response.requiresTwoFactor === true
	);
}

/** API error class for consistent error handling */
export class ApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly response?: ApiErrorResponse
	) {
		super(message);
		this.name = "ApiError";
	}
}
