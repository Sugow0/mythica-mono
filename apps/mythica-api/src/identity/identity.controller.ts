import { Elysia } from "elysia";
import { authController } from "./auth/auth.controller";
import { usersController } from "./users/users.controller";

/**
 * Controller identity : fusion des routes auth et users sous le préfixe /identity.
 * - auth : /identity/register, /identity/login, /identity/logout, /identity/oauth/..., /identity/2fa/..., etc.
 * - users : /identity/me, /identity/me/change-password, /identity/me/change-email, /identity/me/avatar, /identity/users/:id
 */
export const identityController = new Elysia({ prefix: "/identity" })
	.use(authController)
	.use(usersController);
