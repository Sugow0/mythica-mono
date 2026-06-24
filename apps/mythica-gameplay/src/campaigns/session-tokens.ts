import { prisma } from "../lib/prisma";
import { resolveSessionAccess } from "./session-access";

export type TokenCommand =
	| { type: "TOKEN_MOVE"; tokenId: string; x: number; y: number }
	| { type: "TOKEN_REMOVE"; tokenId: string }
	| {
			type: "TOKEN_UPDATE";
			tokenId: string;
			isVisible?: boolean;
			width?: number;
			height?: number;
			label?: string;
	  };

export type TokenEvent =
	| { type: "TOKEN_MOVED"; tokenId: string; x: number; y: number }
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
				return { type: "TOKEN_MOVE", tokenId: cmd.tokenId, x: cmd.x, y: cmd.y };
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
			});
			if (!token || token.sessionId !== sessionId) return null;
			await prisma.sessionToken.update({
				where: { id: command.tokenId },
				data: { posX: command.x, posY: command.y },
			});
			return {
				type: "TOKEN_MOVED",
				tokenId: command.tokenId,
				x: command.x,
				y: command.y,
			};
		}
		case "TOKEN_REMOVE": {
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
			});
			if (!token || token.sessionId !== sessionId) return null;
			const {
				tokenId,
				type: _,
				...updates
			} = command as Record<string, unknown>;
			const updated = await prisma.sessionToken.update({
				where: { id: command.tokenId },
				data: updates as Record<string, unknown>,
			});
			return {
				type: "TOKEN_UPDATED",
				tokenId: command.tokenId,
				...updates,
				updatedAt: updated.updatedAt,
			};
		}
	}
}

export async function getSessionTokens(sessionId: string) {
	return prisma.sessionToken.findMany({
		where: { sessionId },
		orderBy: { createdAt: "asc" },
		include: {
			file: true,
			characterSheet: { select: { name: true, avatarFileId: true } },
		},
	});
}
