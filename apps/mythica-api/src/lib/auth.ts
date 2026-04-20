import { Lucia } from "lucia";
import { luciaRedisAdapter } from "./lucia-redis-adapter";

const cookieDomain = process.env.SESSION_COOKIE_DOMAIN ?? undefined;

export const lucia = new Lucia(luciaRedisAdapter, {
	sessionCookie: {
		attributes: {
			secure: process.env.NODE_ENV === "production",
			domain: cookieDomain,
		},
	},
	getUserAttributes(attributes) {
		return {
			email: attributes.email,
			pseudo: attributes.pseudo,
			firstName: attributes.firstName,
			lastName: attributes.lastName,
			role: attributes.role,
			avatar: attributes.avatar,
			emailVerified: attributes.emailVerified,
			setupTwoFactor:
				attributes.twoFactorSecret !== null &&
				attributes.twoFactorSecret !== "",
		};
	},
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseSessionAttributes: {
			role: string;
		};
		DatabaseUserAttributes: {
			email: string;
			password: string | null;
			pseudo: string;
			firstName: string;
			lastName: string;
			role: string;
			avatar: string | null;
			emailVerified: boolean;
			emailVerifiedAt: Date | null;
			twoFactorSecret: string | null;
		};
	}
}
