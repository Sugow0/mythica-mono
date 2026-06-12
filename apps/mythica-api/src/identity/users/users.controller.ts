import { Elysia, t } from "elysia";
import { getPresignedAvatarUrl } from "../../lib/minio";
import {
	ErrorResponse,
	MeUserSchema,
	PublicUserSchema,
} from "../../lib/schemas";
import { getSessionFromRequest } from "../../lib/session";
import {
	type ChangeEmailBody,
	changeEmailRouteSchema,
} from "./commands/change-email/change-email.dto";
import { changeEmailHandler } from "./commands/change-email/change-email.handler";
import {
	type ChangePasswordBody,
	changePasswordRouteSchema,
} from "./commands/change-password/change-password.dto";
import { changePasswordHandler } from "./commands/change-password/change-password.handler";
import {
	type UpdateProfileBody,
	updateProfileRouteSchema,
} from "./commands/update-profile/update-profile.dto";
import { updateProfileHandler } from "./commands/update-profile/update-profile.handler";
import { uploadAvatarHandler } from "./commands/upload-avatar/upload-avatar.handler";
import { getMeHandler } from "./queries/get-me/get-me.handler";
import { getUserByIdHandler } from "./queries/get-user-by-id/get-user-by-id.handler";
import {
	type GetUsersQuery,
	getUsersRouteSchema,
} from "./queries/get-users/get-users.dto";
import { getUsersHandler } from "./queries/get-users/get-users.handler";

/** Routes users : me, me/change-password, me/change-email, me/avatar, me/avatar-url, users, users/:id */
export const usersController = new Elysia()
	.get(
		"/me",
		async ({ set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await getMeHandler(sessionResult.user.id);
			if (!result.success) {
				set.status = 404;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, user: result.user };
		},
		{
			response: {
				200: t.Object({ success: t.Literal(true), user: MeUserSchema }),
				401: ErrorResponse,
				404: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Mon profil",
				description: "Récupère les informations de l'utilisateur connecté",
			},
		},
	)
	.patch(
		"/me",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await updateProfileHandler(
				sessionResult.user.id,
				body as UpdateProfileBody,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, user: result.user };
		},
		updateProfileRouteSchema,
	)
	.post(
		"/me/change-password",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await changePasswordHandler(
				sessionResult.user.id,
				body as ChangePasswordBody,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, message: "Mot de passe modifié." };
		},
		changePasswordRouteSchema,
	)
	.post(
		"/me/change-email",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await changeEmailHandler(
				sessionResult.user.id,
				body as ChangeEmailBody,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return {
				success: true as const,
				message:
					"Email modifié. Un lien de vérification a été envoyé à la nouvelle adresse.",
			};
		},
		changeEmailRouteSchema,
	)
	.post(
		"/me/avatar",
		async ({ body, set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			// Elysia parse déjà le multipart : on lit le fichier depuis `body`
			// (appeler request.formData() ici échouerait, le flux étant consommé).
			const file = body.avatar ?? body.file;
			if (!file || !(file instanceof File)) {
				set.status = 400;
				return {
					success: false as const,
					error: "Fichier manquant. Envoyez un champ 'avatar' ou 'file'.",
				};
			}
			const buffer = Buffer.from(await file.arrayBuffer());
			const contentType = file.type || "image/jpeg";
			const result = await uploadAvatarHandler(
				sessionResult.user.id,
				buffer,
				contentType,
			);
			if (!result.success) {
				set.status = 400;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, avatarKey: result.avatarKey };
		},
		{
			body: t.Object({
				avatar: t.Optional(t.File()),
				file: t.Optional(t.File()),
			}),
			response: {
				200: t.Object({ success: t.Literal(true), avatarKey: t.String() }),
				400: ErrorResponse,
				401: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Uploader un avatar",
				description: "Upload une image pour l'avatar (multipart/form-data)",
			},
		},
	)
	.get(
		"/me/avatar-url",
		async ({ set, request }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const avatarKey = sessionResult.user.avatar;
			if (!avatarKey) {
				return { success: true as const, avatarUrl: null };
			}
			const avatarUrl = await getPresignedAvatarUrl(avatarKey);
			return { success: true as const, avatarUrl };
		},
		{
			response: {
				200: t.Object({
					success: t.Literal(true),
					avatarUrl: t.Nullable(t.String()),
				}),
				401: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "URL de l'avatar",
				description: "Récupère l'URL signée de l'avatar",
			},
		},
	)
	.get(
		"/users",
		async ({ set, request, query }) => {
			const sessionResult = await getSessionFromRequest(request);
			if (!sessionResult.ok) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}
			const result = await getUsersHandler(query as GetUsersQuery);
			return result;
		},
		getUsersRouteSchema,
	)
	.get(
		"/users/:id",
		async ({ params, set }) => {
			const result = await getUserByIdHandler(params.id);
			if (!result.success) {
				set.status = 404;
				return { success: false as const, error: result.error };
			}
			return { success: true as const, user: result.user };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({ success: t.Literal(true), user: PublicUserSchema }),
				404: ErrorResponse,
			},
			detail: {
				tags: ["Identity"],
				summary: "Détails d'un utilisateur",
				description: "Récupère les informations publiques d'un utilisateur",
			},
		},
	);
