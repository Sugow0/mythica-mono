// apps/mythica-front/src/lib/vtt/types.ts

export type GridType = "square" | "hex" | "free";

export type MapConfig = {
	id: string;
	campaignId: string;
	nom: string;
	fileId: string | null;
	gridType: GridType;
	gridSize: number;
	gridOffsetX: number;
	gridOffsetY: number;
	gridColor: string;
	gridOpacity: number;
	widthPx: number;
	heightPx: number;
};

export type FogState = {
	mode: "manual" | "dynamic";
	revealed: Array<{ x: number; y: number }[]>;
};

export type CombatState = {
	started: boolean;
	order: string[];
	activeIndex: number;
	round: number;
	activeTurn: string | null;
};

export type SessionTokenDto = {
	id: string;
	sessionId: string;
	characterSheetId: string | null;
	label: string | null;
	fileId: string | null;
	posX: string;
	posY: string;
	width: number;
	height: number;
	isVisible: boolean;
	layer: "background" | "object" | "token" | "gm";
	elevation?: number;
	hp?: number | null;
	maxHp?: number | null;
	conditions?: any; // e.g. Array of strings or objects
	auraRadius?: string | null;
	auraColor?: string | null;
	visionRadius?: string | null;
	lightRadius?: string | null;
	lightColor?: string | null;
};

export type Participant = {
	userId: string;
	pseudo?: string | null;
	color?: string | null;
};

export type DiceRollEvent = {
	formula: string;
	results: number[];
	total: number;
	isPrivate: boolean;
	rollerId: string;
};

export type SessionWallDto = {
	id: string;
	sessionId: string;
	p1X: string | number;
	p1Y: string | number;
	p2X: string | number;
	p2Y: string | number;
	type: "normal" | "invisible" | "door" | "window";
};
