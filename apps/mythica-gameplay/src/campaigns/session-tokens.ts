import { prisma } from "../lib/prisma";
import { isGameMaster, resolveSessionAccess } from "./session-access";

export type TokenCommand =
	| { type: "TOKEN_MOVE"; tokenId: string; x: number; y: number; waypoints?: {x: number, y: number}[] }
	| { type: "TOKEN_REMOVE"; tokenId: string }
	| {
			type: "TOKEN_UPDATE";
			tokenId: string;
			isVisible?: boolean;
			width?: number;
			height?: number;
			label?: string;
			hp?: number | null;
			maxHp?: number | null;
			conditions?: any;
			auraRadius?: number | null;
			auraColor?: string | null;
			visionRadius?: number | null;
			lightRadius?: number | null;
			lightColor?: string | null;
			elevation?: number;
	  };

export type TokenEvent =
	| { type: "TOKEN_MOVED"; tokenId: string; x: number; y: number; waypoints?: {x: number, y: number}[] }
	| { type: "TOKEN_REMOVED"; tokenId: string }
	| { type: "TOKEN_UPDATED"; tokenId: string; [key: string]: unknown };

export function parseTokenCommand(raw: unknown): TokenCommand | null {
	let data: unknown = raw;
	if (typeof raw === "string") {
		try {
			data = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!data || typeof data !== "object") return null;
	const cmd = data as Record<string, unknown>;
	switch (cmd.type) {
		case "TOKEN_MOVE":
			if (
				typeof cmd.tokenId === "string" &&
				typeof cmd.x === "number" &&
				typeof cmd.y === "number"
			) {
				return { 
					type: "TOKEN_MOVE", 
					tokenId: cmd.tokenId, 
					x: cmd.x, 
					y: cmd.y,
					waypoints: Array.isArray(cmd.waypoints) ? cmd.waypoints : undefined
				};
			}
			return null;
		case "TOKEN_REMOVE":
			return typeof cmd.tokenId === "string"
				? { type: "TOKEN_REMOVE", tokenId: cmd.tokenId }
				: null;
		case "TOKEN_UPDATE": {
			if (typeof cmd.tokenId !== "string") return null;
			const update: TokenCommand = {
				type: "TOKEN_UPDATE",
				tokenId: cmd.tokenId,
			};
			if (typeof cmd.isVisible === "boolean")
				(update as Record<string, unknown>).isVisible = cmd.isVisible;
			if (typeof cmd.width === "number")
				(update as Record<string, unknown>).width = cmd.width;
			if (typeof cmd.height === "number")
				(update as Record<string, unknown>).height = cmd.height;
			if (typeof cmd.label === "string")
				(update as Record<string, unknown>).label = cmd.label;
			if (typeof cmd.hp === "number" || cmd.hp === null)
				(update as Record<string, unknown>).hp = cmd.hp;
			if (typeof cmd.maxHp === "number" || cmd.maxHp === null)
				(update as Record<string, unknown>).maxHp = cmd.maxHp;
			if (cmd.conditions !== undefined)
				(update as Record<string, unknown>).conditions = cmd.conditions;
			if (typeof cmd.auraRadius === "number" || cmd.auraRadius === null)
				(update as Record<string, unknown>).auraRadius = cmd.auraRadius;
			if (typeof cmd.auraColor === "string" || cmd.auraColor === null)
				(update as Record<string, unknown>).auraColor = cmd.auraColor;
			if (typeof cmd.visionRadius === "number" || cmd.visionRadius === null)
				(update as Record<string, unknown>).visionRadius = cmd.visionRadius;
			if (typeof cmd.lightRadius === "number" || cmd.lightRadius === null)
				(update as Record<string, unknown>).lightRadius = cmd.lightRadius;
			if (typeof cmd.lightColor === "string" || cmd.lightColor === null)
				(update as Record<string, unknown>).lightColor = cmd.lightColor;
			if (typeof cmd.elevation === "number")
				(update as Record<string, unknown>).elevation = cmd.elevation;
			return update;
		}
		default:
			return null;
	}
}

export async function handleTokenCommand(
	sessionId: string,
	userId: string,
	command: TokenCommand,
): Promise<TokenEvent | null> {
	const access = await resolveSessionAccess(sessionId, {
		id: userId,
		role: null,
	});
	if (!access.ok) return null;

	switch (command.type) {
		case "TOKEN_MOVE": {
			const token = await prisma.sessionToken.findUnique({
				where: { id: command.tokenId },
				include: { characterSheet: { select: { userId: true } } },
			});
			if (!token || token.sessionId !== sessionId) return null;

			const isGm = isGameMaster(access)({ id: userId, role: null });
			if (!isGm) {
				// Les joueurs ne peuvent déplacer que les tokens liés à LEURS fiches.
				if (!token.characterSheet || token.characterSheet.userId !== userId) {
					return null;
				}
			}

			await prisma.sessionToken.update({
				where: { id: command.tokenId },
				data: { posX: command.x, posY: command.y },
			});
			return {
				type: "TOKEN_MOVED",
				tokenId: command.tokenId,
				x: command.x,
				y: command.y,
				waypoints: command.waypoints,
			};
		}
		case "TOKEN_REMOVE": {
			// Suppression réservée au MJ (cohérent avec DELETE /sessions/:id/tokens/:tokenId).
			if (!isGameMaster(access)({ id: userId, role: null })) return null;
			const token = await prisma.sessionToken.findUnique({
				where: { id: command.tokenId },
			});
			if (!token || token.sessionId !== sessionId) return null;
			await prisma.sessionToken.delete({ where: { id: command.tokenId } });
			return { type: "TOKEN_REMOVED", tokenId: command.tokenId };
		}
		case "TOKEN_UPDATE": {
			const token = await prisma.sessionToken.findUnique({
				where: { id: command.tokenId },
				include: { characterSheet: { select: { id: true, userId: true } } },
			});
			if (!token || token.sessionId !== sessionId) return null;

			const isGm = isGameMaster(access)({ id: userId, role: null });
			if (!isGm) {
				if (!token.characterSheet || token.characterSheet.userId !== userId) {
					return null;
				}
			}
			const {
				tokenId,
				type: _,
				hp,
				maxHp,
				...updates
			} = command as Record<string, unknown>;

			const newHp = hp as number | undefined | null;
			const newMaxHp = maxHp as number | undefined | null;

			// Si le token est lié à une fiche et qu'on modifie les HP
			if (
				token.characterSheet &&
				(newHp !== undefined || newMaxHp !== undefined)
			) {
				// Fetch property "hp" ID
				const hpProp = await prisma.characterSheetProperty.findUnique({
					where: { key: "hp" },
				});
				if (hpProp) {
					const sheetVal = await prisma.characterSheetValue.findUnique({
						where: {
							characterSheetId_propertyId: {
								characterSheetId: token.characterSheet.id,
								propertyId: hpProp.id,
							},
						},
					});
					const currentVal =
						(sheetVal?.value as { current?: number; max?: number }) || {};
					const nextVal = {
						...currentVal,
						current: newHp !== undefined ? newHp : currentVal.current,
						max: newMaxHp !== undefined ? newMaxHp : currentVal.max,
					};
					await prisma.characterSheetValue.upsert({
						where: {
							characterSheetId_propertyId: {
								characterSheetId: token.characterSheet.id,
								propertyId: hpProp.id,
							},
						},
						create: {
							characterSheetId: token.characterSheet.id,
							propertyId: hpProp.id,
							value: nextVal as any,
						},
						update: { value: nextVal as any },
					});
				}
			} else {
				if (newHp !== undefined) updates.hp = newHp;
				if (newMaxHp !== undefined) updates.maxHp = newMaxHp;
			}

			const updated = await prisma.sessionToken.update({
				where: { id: command.tokenId },
				data: updates as Record<string, unknown>,
			});

			return {
				type: "TOKEN_UPDATED",
				tokenId: command.tokenId,
				...updates,
				hp: newHp !== undefined ? newHp : token.hp,
				maxHp: newMaxHp !== undefined ? newMaxHp : token.maxHp,
				updatedAt: updated.updatedAt,
			};
		}
	}
}

export async function getSessionTokens(sessionId: string) {
	const tokens = await prisma.sessionToken.findMany({
		where: { sessionId },
		orderBy: { createdAt: "asc" },
		include: {
			file: true,
			characterSheet: {
				include: {
					values: {
						where: { property: { key: "hp" } },
						select: { value: true },
					},
				},
			},
		},
	});

	return tokens.map(mapTokenDto);
}

export function mapTokenDto(t: any) {
	let hp = t.hp;
	let maxHp = t.maxHp;

	if (t.characterSheet) {
		const hpValue = t.characterSheet.values?.[0]?.value as
			| { current?: number; max?: number }
			| undefined;
		if (hpValue && typeof hpValue === "object") {
			hp = hpValue.current ?? hp;
			maxHp = hpValue.max ?? maxHp;
		}
	}

	const { characterSheet, posX, posY, ...rest } = t;

	return {
		...rest,
		posX: posX?.toString() ?? "0",
		posY: posY?.toString() ?? "0",
		hp,
		maxHp,
		characterSheet: characterSheet
			? {
					id: characterSheet.id,
					name: characterSheet.name,
					avatarFileId: characterSheet.avatarFileId,
				}
			: null,
	};
}
