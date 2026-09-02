import { Elysia, t } from "elysia";
import { authContext } from "../auth/context";
import { ErrorResponse } from "../lib/http";
import { newId } from "../lib/id";
import { prisma } from "../lib/prisma";

/** Code d'erreur Prisma pour violation de contrainte d'unicité. */
const PRISMA_UNIQUE_VIOLATION = "P2002";

function prismaErrorCode(err: unknown): string | undefined {
	return (err as { code?: string }).code;
}

/** Valeurs autorisées pour `type`, alignées sur l'enum Prisma `PropertyType`. */
const PropertyTypeSchema = t.Union([
	t.Literal("text"),
	t.Literal("number"),
	t.Literal("boolean"),
	t.Literal("select"),
	t.Literal("multiselect"),
	t.Literal("textarea"),
	t.Literal("resource"),
	t.Literal("list"),
	t.Literal("derived"),
]);

const CreatePropertyBody = t.Object({
	key: t.String({ minLength: 1, maxLength: 100 }),
	label: t.String({ minLength: 1, maxLength: 255 }),
	type: PropertyTypeSchema,
	defaultValue: t.Optional(t.String()),
	// JSON libre, pertinent surtout pour select / multiselect.
	options: t.Optional(t.Unknown()),
	description: t.Optional(t.String()),
});

export const characterSheetPropertiesController = new Elysia({
	prefix: "/character-sheet-properties",
})
	.use(authContext)

	/** POST /character-sheet-properties - Créer une property globale */
	.post(
		"/",
		async ({ set, currentUser, body }) => {
			if (!currentUser) {
				set.status = 401;
				return { success: false as const, error: "Non authentifié" };
			}

			// On vérifie d'abord l'unicité de la key pour proposer la
			// réutilisation d'une propriété existante plutôt qu'un doublon.
			const existing = await prisma.characterSheetProperty.findUnique({
				where: { key: body.key },
			});
			if (existing) {
				set.status = 409;
				return {
					success: false as const,
					error: `Une propriété avec la clé "${body.key}" existe déjà : réutilisez-la plutôt que d'en créer une nouvelle`,
					existingId: existing.id,
				};
			}

			try {
				const created = await prisma.characterSheetProperty.create({
					data: {
						id: newId(),
						key: body.key,
						label: body.label,
						type: body.type,
						defaultValue: body.defaultValue ?? null,
						options: body.options ?? null,
						description: body.description ?? null,
					},
				});
				set.status = 201;
				return { success: true as const, id: created.id };
			} catch (err) {
				// Filet de sécurité contre une course entre le findUnique et le create.
				if (prismaErrorCode(err) === PRISMA_UNIQUE_VIOLATION) {
					set.status = 409;
					return {
						success: false as const,
						error: `Une propriété avec la clé "${body.key}" existe déjà : réutilisez-la plutôt que d'en créer une nouvelle`,
					};
				}
				throw err;
			}
		},
		{
			body: CreatePropertyBody,
			response: {
				201: t.Object({ success: t.Literal(true), id: t.String() }),
				401: ErrorResponse,
				409: t.Object({
					success: t.Literal(false),
					error: t.String(),
					existingId: t.Optional(t.String()),
				}),
			},
			detail: {
				tags: ["CharacterSheetProperties"],
				summary: "Créer une propriété de fiche de personnage",
			},
		},
	);
