import { prisma } from "../lib/prisma";
import { isGameMaster, resolveSessionAccess } from "./session-access";

export type WallCommand =
	| {
			type: "WALL_ADD";
			p1X: number;
			p1Y: number;
			p2X: number;
			p2Y: number;
			wallType?: string;
	  }
	| { type: "WALL_REMOVE"; wallId: string }
	| { type: "WALL_CLEAR" };

export type WallEvent =
	| { type: "WALL_ADDED"; wall: unknown }
	| { type: "WALL_REMOVED"; wallId: string }
	| { type: "WALL_CLEARED" };

export function parseWallCommand(raw: unknown): WallCommand | null {
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
		case "WALL_ADD":
			if (
				typeof cmd.p1X === "number" &&
				typeof cmd.p1Y === "number" &&
				typeof cmd.p2X === "number" &&
				typeof cmd.p2Y === "number"
			) {
				return {
					type: "WALL_ADD",
					p1X: cmd.p1X,
					p1Y: cmd.p1Y,
					p2X: cmd.p2X,
					p2Y: cmd.p2Y,
					wallType: typeof cmd.wallType === "string" ? cmd.wallType : "normal",
				};
			}
			return null;
		case "WALL_REMOVE":
			return typeof cmd.wallId === "string"
				? { type: "WALL_REMOVE", wallId: cmd.wallId }
				: null;
		case "WALL_CLEAR":
			return { type: "WALL_CLEAR" };
		default:
			return null;
	}
}

export async function handleWallCommand(
	sessionId: string,
	userId: string,
	command: WallCommand,
): Promise<WallEvent | null> {
	const access = await resolveSessionAccess(sessionId, {
		id: userId,
		role: null,
	});
	if (!access.ok) return null;

	// Seul le MJ peut manipuler les murs
	if (!isGameMaster(access)({ id: userId, role: null })) return null;

	switch (command.type) {
		case "WALL_ADD": {
			const wallTypeEnum = command.wallType as
				| "normal"
				| "invisible"
				| "door"
				| "window";
			const wall = await prisma.sessionWall.create({
				data: {
					sessionId,
					p1X: command.p1X,
					p1Y: command.p1Y,
					p2X: command.p2X,
					p2Y: command.p2Y,
					type: wallTypeEnum,
				},
			});
			return {
				type: "WALL_ADDED",
				wall,
			};
		}
		case "WALL_REMOVE": {
			const wall = await prisma.sessionWall.findUnique({
				where: { id: command.wallId },
			});
			if (!wall || wall.sessionId !== sessionId) return null;
			await prisma.sessionWall.delete({
				where: { id: command.wallId },
			});
			return { type: "WALL_REMOVED", wallId: command.wallId };
		}
		case "WALL_CLEAR": {
			await prisma.sessionWall.deleteMany({
				where: { sessionId },
			});
			return { type: "WALL_CLEARED" };
		}
	}
}

export async function getSessionWalls(sessionId: string) {
	return await prisma.sessionWall.findMany({
		where: { sessionId },
		orderBy: { createdAt: "asc" },
	});
}
