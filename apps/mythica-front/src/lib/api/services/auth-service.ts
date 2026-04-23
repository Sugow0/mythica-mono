import { ApiClient } from "../api-client";
import type { paths } from "../generated/platform";

/**
 * Authentication data types
 */
export interface RegisterData {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	pseudo: string;
}

export interface LoginData {
	email: string;
	password: string;
}

export interface Login2faData {
	tempToken: string;
	code: string;
}

export interface ChangePasswordData {
	currentPassword: string;
	newPassword: string;
}

export interface ChangeEmailData {
	newEmail: string;
	code: string;
}

export type OAuthProvider = "google" | "discord" | "apple";

/**
 * Authentication Service
 * Handles all authentication-related API calls including:
 * - Registration and email verification
 * - Login (standard and 2FA)
 * - OAuth flows
 * - Password management
 * - Two-factor authentication setup
 */
export class AuthService extends ApiClient {
	private client;

	constructor(baseUrl?: string) {
		super(
			baseUrl ??
				`${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`
		);
		this.client = this.createClient<paths>();
	}

	// ============================================
	// Registration & Email Verification
	// ============================================

	/**
	 * Register a new user account.
	 * Sends verification email upon success.
	 */
	async register(data: RegisterData) {
		const { data: response, error } = await this.client.POST(
			"/identity/register",
			{
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Verify email with token from verification email.
	 */
	async verifyEmail(token: string) {
		const { data: response, error } = await this.client.POST(
			"/identity/verify-email",
			{
				body: { token },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Resend email verification to the specified email.
	 */
	async resendVerification(email: string) {
		const { data: response, error } = await this.client.POST(
			"/identity/resend-verification",
			{
				body: { email },
			}
		);

		if (error) throw error;
		return response;
	}

	// ============================================
	// Login & Logout
	// ============================================

	/**
	 * Login with email and password.
	 * May return user or require 2FA verification.
	 */
	async login(data: LoginData) {
		const { data: response, error } = await this.client.POST(
			"/identity/login",
			{
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Complete login with 2FA code.
	 * Call this after login() returns requiresTwoFactor.
	 */
	async login2fa(data: Login2faData) {
		const { data: response, error } = await this.client.POST(
			"/identity/login/2fa",
			{
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Logout current user.
	 * Clears authentication cookies.
	 */
	async logout() {
		const { data: response, error } =
			await this.client.POST("/identity/logout");

		if (error) throw error;
		return response;
	}

	// ============================================
	// OAuth
	// ============================================

	/**
	 * Get OAuth redirect URL for a provider.
	 * Includes a callbackUrl so the backend knows where to redirect after auth.
	 */
	getOauthUrl(provider: OAuthProvider): string {
		const callbackUrl = encodeURIComponent(
			`${window.location.origin}/auth/callback`
		);
		return `${this.baseUrl}/identity/oauth/${provider}?callbackUrl=${callbackUrl}`;
	}

	/**
	 * Redirect to OAuth provider for authentication.
	 */
	redirectToOAuth(provider: OAuthProvider): void {
		window.location.href = this.getOauthUrl(provider);
	}

	// ============================================
	// Two-Factor Authentication
	// ============================================

	/**
	 * Initialize 2FA setup.
	 * Returns QR code and secret for authenticator app.
	 */
	async setup2fa() {
		const { data: response, error } = await this.client.POST(
			"/identity/2fa/setup"
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Confirm 2FA setup with verification code.
	 * Returns backup codes.
	 */
	async confirm2fa(code: string) {
		const { data: response, error } = await this.client.POST(
			"/identity/2fa/confirm",
			{
				body: { code },
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Disable 2FA with password confirmation.
	 */
	async disable2fa(password: string) {
		const { data: response, error } = await this.client.POST(
			"/identity/2fa/disable",
			{
				body: { password },
			}
		);

		if (error) throw error;
		return response;
	}

	// ============================================
	// Current User Profile
	// ============================================

	/**
	 * Get current authenticated user's profile.
	 */
	async getMe() {
		const { data: response, error } = await this.client.GET("/identity/me");

		if (error) throw error;
		return response;
	}

	/**
	 * Change user's password.
	 */
	async changePassword(data: ChangePasswordData) {
		const { data: response, error } = await this.client.POST(
			"/identity/me/change-password",
			{
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Request email change.
	 * Requires 2FA code for verification.
	 */
	async changeEmail(data: ChangeEmailData) {
		const { data: response, error } = await this.client.POST(
			"/identity/me/change-email",
			{
				body: data,
			}
		);

		if (error) throw error;
		return response;
	}

	/**
	 * Upload new avatar image.
	 */
	async uploadAvatar(file: File) {
		const formData = new FormData();
		formData.append("avatar", file);

		const response = await fetch(`${this.baseUrl}/identity/me/avatar`, {
			method: "POST",
			body: formData,
			credentials: "include",
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => null);
			throw new Error(errorBody?.error ?? "Failed to upload avatar");
		}

		return response.json();
	}

	/**
	 * Get current user's avatar URL.
	 */
	async getAvatarUrl() {
		const { data: response, error } = await this.client.GET(
			"/identity/me/avatar-url"
		);

		if (error) throw error;
		return response;
	}
}

/** Singleton instance of the Auth Service */
export const authService = new AuthService();
