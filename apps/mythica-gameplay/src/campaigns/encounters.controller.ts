import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";
import { requireCampaignGm } from "./campaigns.helpers";

export const encountersController = new Elysia({ prefix: "/campaigns" })
	.use(authContext)

	/** GET /campaigns/:id/encounters — Liste des rencontres de la campagne */
	.get(
		"/:id/encounters",
		async ({ params, currentUser, set }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non autorisé" };
			}
			const access = await requireCampaignGm(params.id, currentUser.id);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}

			const encounters = await prisma.encounter.findMany({
				where: { campaignId: params.id },
				include: {
					monsters: {
						include: { characterSheet: true },
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return {
				success: true as const,
				items: encounters.map((enc) => ({
					id: enc.id,
					nom: enc.nom,
					difficulty: enc.difficulty,
					monsters: enc.monsters.map((m) => ({
						id: m.id,
						characterSheetId: m.characterSheetId,
						name: m.characterSheet.name,
						avatarFileId: m.characterSheet.avatarFileId,
						quantity: m.quantity,
					})),
				})),
			};
		},
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			detail: { tags: ["Campaigns"], summary: "Liste des rencontres" },
		},
	)

	/** POST /campaigns/:id/encounters — Créer une rencontre */
	.post(
		"/:id/encounters",
		async ({ params, body, currentUser, set }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non autorisé" };
			}
			const access = await requireCampaignGm(params.id, currentUser.id);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}

			const encounter = await prisma.encounter.create({
				data: {
					id: newId(),
					campaignId: params.id,
					nom: body.nom,
					difficulty: body.difficulty,
				},
			});

			set.status = 201;
			return { success: true as const, id: encounter.id };
		},
		{
			params: t.Object({ id: t.String({ format: "uuid" }) }),
			body: t.Object({
				nom: t.String(),
				difficulty: t.Optional(t.String()),
			}),
			detail: { tags: ["Campaigns"], summary: "Créer une rencontre" },
		},
	)

	/** DELETE /campaigns/:id/encounters/:encounterId — Supprimer une rencontre */
	.delete(
		"/:id/encounters/:encounterId",
		async ({ params, currentUser, set }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non autorisé" };
			}
			const access = await requireCampaignGm(params.id, currentUser.id);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}

			await prisma.encounter.delete({
				where: {
					id: params.encounterId,
					campaignId: params.id,
				},
			});

			return { success: true as const, message: "Rencontre supprimée" };
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
				encounterId: t.String({ format: "uuid" }),
			}),
			detail: { tags: ["Campaigns"], summary: "Supprimer une rencontre" },
		},
	)

	/** POST /campaigns/:id/encounters/:encounterId/monsters — Ajouter un monstre */
	.post(
		"/:id/encounters/:encounterId/monsters",
		async ({ params, body, currentUser, set }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non autorisé" };
			}
			const access = await requireCampaignGm(params.id, currentUser.id);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}

			const encounter = await prisma.encounter.findFirst({
				where: { id: params.encounterId, campaignId: params.id },
			});
			if (!encounter) {
				set.status = 404;
				return { success: false as const, error: "Rencontre introuvable" };
			}

			const monster = await prisma.encounterMonster.create({
				data: {
					id: newId(),
					encounterId: encounter.id,
					characterSheetId: body.characterSheetId,
					quantity: body.quantity ?? 1,
				},
			});

			set.status = 201;
			return { success: true as const, id: monster.id };
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
				encounterId: t.String({ format: "uuid" }),
			}),
			body: t.Object({
				characterSheetId: t.String({ format: "uuid" }),
				quantity: t.Optional(t.Number()),
			}),
			detail: {
				tags: ["Campaigns"],
				summary: "Ajouter un monstre à la rencontre",
			},
		},
	)

	/** DELETE /campaigns/:id/encounters/:encounterId/monsters/:monsterId — Retirer un monstre */
	.delete(
		"/:id/encounters/:encounterId/monsters/:monsterId",
		async ({ params, currentUser, set }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non autorisé" };
			}
			const access = await requireCampaignGm(params.id, currentUser.id);
			if (!access.ok) {
				set.status = access.status;
				return { success: false as const, error: access.error };
			}

			await prisma.encounterMonster.delete({
				where: {
					id: params.monsterId,
					encounterId: params.encounterId,
				},
			});

			return { success: true as const, message: "Monstre retiré" };
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
				encounterId: t.String({ format: "uuid" }),
				monsterId: t.String({ format: "uuid" }),
			}),
			detail: { tags: ["Campaigns"], summary: "Retirer un monstre" },
		},
	);
