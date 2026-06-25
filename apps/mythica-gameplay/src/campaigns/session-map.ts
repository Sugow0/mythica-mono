import { prisma } from "../lib/prisma";
import { isGameMaster, resolveSessionAccess } from "./session-access";

type Point = { x: number; y: number };
type FogState = { mode: "manual" | "dynamic"; revealed: Point[][] };

export type MapCommand =
	| { type: "FOG_PAINT"; polygons: Point[][] }
	| { type: "FOG_CLEAR" }
	| { type: "FOG_REVEAL_AROUND"; tokenId: string; radius: number }
	| {
			type: "DICE_ROLL";
			formula: string;
			results: number[];
			total: number;
			isPrivate: boolean;
	  };

export type MapEvent =
	| { type: "FOG_STATE"; fog: FogState }
	| {
			type: "DICE_ROLL";
			formula: string;
			results: number[];
			total: number;
			isPrivate: boolean;
	  };

export function parseMapCommand(raw: unknown): MapCommand | null {
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
		case "FOG_PAINT":
			if (!Array.isArray(cmd.polygons)) return null;
			return { type: "FOG_PAINT", polygons: cmd.polygons as Point[][] };
		case "FOG_CLEAR":
			return { type: "FOG_CLEAR" };
		case "FOG_REVEAL_AROUND":
			if (typeof cmd.tokenId === "string" && typeof cmd.radius === "number") {
				return {
					type: "FOG_REVEAL_AROUND",
					tokenId: cmd.tokenId,
					radius: cmd.radius,
				};
			}
			return null;
		case "DICE_ROLL":
			if (
				typeof cmd.formula === "string" &&
				Array.isArray(cmd.results) &&
				typeof cmd.total === "number" &&
				typeof cmd.isPrivate === "boolean"
			) {
				return {
					type: "DICE_ROLL",
					formula: cmd.formula,
					results: cmd.results as number[],
					total: cmd.total,
					isPrivate: cmd.isPrivate,
				};
			}
			return null;
		default:
			return null;
	}
}

function parseFogState(raw: unknown): FogState {
	if (raw && typeof raw === "object") {
		const obj = raw as Record<string, unknown>;
		if (obj.fog && typeof obj.fog === "object") {
			return obj.fog as FogState;
		}
	}
	return { mode: "manual", revealed: [] };
}

export async function handleMapCommand(
	sessionId: string,
	userId: string,
	command: MapCommand,
): Promise<MapEvent | null> {
	// DICE_ROLL : tout participant peut lancer (vérification d'accès session requise)
	if (command.type === "DICE_ROLL") {
		const access = await resolveSessionAccess(sessionId, {
			id: userId,
			role: null,
		});
		if (!access.ok) return null;
		return { type: "DICE_ROLL", ...command };
	}

	// FOG_* : réservé au MJ
	const access = await resolveSessionAccess(sessionId, {
		id: userId,
		role: null,
	});
	if (!access.ok) return null;
	if (!isGameMaster(access)({ id: userId, role: null })) return null;

	const session = await prisma.session.findUnique({ where: { id: sessionId } });
	if (!session) return null;

	const currentFog = parseFogState(session.mapState);
	let nextFog: FogState;

	if (command.type === "FOG_CLEAR") {
		nextFog = { mode: currentFog.mode, revealed: [] };
	} else if (command.type === "FOG_REVEAL_AROUND") {
		const token = await prisma.sessionToken.findUnique({
			where: { id: command.tokenId },
		});
		if (!token || token.sessionId !== sessionId) return null;

		// Calculer un polygone circulaire (32 segments) autour de la position du token
		const circlePoints: Point[] = [];
		const segments = 32;
		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * 2 * Math.PI;
			circlePoints.push({
				x: Math.round(token.posX + Math.cos(angle) * command.radius),
				y: Math.round(token.posY + Math.sin(angle) * command.radius),
			});
		}

		// Ajouter ce cercle aux zones révélées (permanent fog exploration)
		// On limite le mode à "dynamic" s'il ne l'était pas
		nextFog = {
			mode: "dynamic",
			revealed: [...currentFog.revealed, circlePoints],
		};
	} else {
		nextFog = { ...currentFog, revealed: command.polygons };
	}

	const mapState =
		typeof session.mapState === "object" && session.mapState
			? { ...(session.mapState as object), fog: nextFog }
			: { fog: nextFog };

	await prisma.session.update({
		where: { id: sessionId },
		data: { mapState: mapState as object },
	});

	return { type: "FOG_STATE", fog: nextFog };
}
