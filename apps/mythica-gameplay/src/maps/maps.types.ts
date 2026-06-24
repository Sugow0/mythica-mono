import { t } from "elysia";

export const GridTypeSchema = t.Union([
	t.Literal("square"),
	t.Literal("hex"),
	t.Literal("free"),
]);

export const MapDto = t.Object({
	id: t.String({ format: "uuid" }),
	campaignId: t.String({ format: "uuid" }),
	nom: t.String(),
	fileId: t.Union([t.String({ format: "uuid" }), t.Null()]),
	gridType: GridTypeSchema,
	gridSize: t.Integer(),
	gridOffsetX: t.Integer(),
	gridOffsetY: t.Integer(),
	gridColor: t.String(),
	gridOpacity: t.Number(),
	widthPx: t.Integer(),
	heightPx: t.Integer(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export const CreateMapBody = t.Object({
	nom: t.String({ minLength: 1, maxLength: 255 }),
	gridType: t.Optional(GridTypeSchema),
	gridSize: t.Optional(t.Integer({ minimum: 20, maximum: 500 })),
	gridOffsetX: t.Optional(t.Integer()),
	gridOffsetY: t.Optional(t.Integer()),
	gridColor: t.Optional(t.String({ pattern: "^#[0-9a-fA-F]{6,8}$" })),
	gridOpacity: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
	widthPx: t.Optional(t.Integer({ minimum: 500, maximum: 10000 })),
	heightPx: t.Optional(t.Integer({ minimum: 500, maximum: 10000 })),
});

export const UpdateMapBody = t.Partial(CreateMapBody);
