// apps/mythica-front/src/lib/vtt/vtt.svelte.ts
import type {
	CombatState,
	FogState,
	MapConfig,
	SessionTokenDto,
	SessionWallDto,
	DiceRollEvent,
} from "./types";

export const vttState = (() => {
	let tokens = $state<SessionTokenDto[]>([]);
	let walls = $state<SessionWallDto[]>([]);
	let fog = $state<FogState>({ mode: "manual", revealed: [] });
	let activeMap = $state<MapConfig | null>(null);
	let combatState = $state<CombatState>({
		started: false,
		order: [],
		activeIndex: 0,
		round: 0,
		activeTurn: null,
	});
	let participants = $state<string[]>([]);
	let selectedToolId = $state<
		| "select"
		| "move"
		| "fog-paint"
		| "fog-erase"
		| "add-token"
		| "ruler"
		| "wall-add"
		| "wall-move"
		| "wall-remove"
	>("select");
	let selectedTokenId = $state<string | null>(null);
	let isGm = $state(false);
	let diceRolls = $state<DiceRollEvent[]>([]);
	let isTokenDragging = $state(false);
	let focusedTokenId: string | null = $state(null);
	let myCharacterSheetId: string | null = $state(null);
	const customNames = $state<Record<string, string>>({});
	let use3DDice = $state(true);

	return {
		get tokens() {
			return tokens;
		},
		get fog() {
			return fog;
		},
		get activeMap() {
			return activeMap;
		},
		get combatState() {
			return combatState;
		},
		get participants() {
			return participants;
		},
		get selectedToolId() {
			return selectedToolId;
		},
		get selectedTokenId() {
			return selectedTokenId;
		},
		get isGm() {
			return isGm;
		},
		get diceRolls() {
			return diceRolls;
		},
		get isTokenDragging() {
			return isTokenDragging;
		},
		get focusedTokenId() {
			return focusedTokenId;
		},
		get myCharacterSheetId() {
			return myCharacterSheetId;
		},
		get customNames() {
			return customNames;
		},

		get walls() {
			return walls;
		},

		setTokens(v: SessionTokenDto[]) {
			tokens = v;
		},
		setWalls(v: SessionWallDto[]) {
			walls = v;
		},
		addWall(wall: SessionWallDto) {
			walls = [...walls, wall];
		},
		removeWall(id: string) {
			walls = walls.filter((w) => w.id !== id);
		},
		clearWalls() {
			walls = [];
		},
		updateToken(updated: Partial<SessionTokenDto> & { id: string }) {
			const idx = tokens.findIndex((t) => t.id === updated.id);
			if (idx >= 0) tokens[idx] = { ...tokens[idx], ...updated };
		},
		addToken(token: SessionTokenDto) {
			tokens = [...tokens, token];
		},
		removeToken(id: string) {
			tokens = tokens.filter((t) => t.id !== id);
		},
		setFog(v: FogState) {
			fog = v;
		},
		setActiveMap(v: MapConfig | null) {
			activeMap = v;
		},
		setCombatState(v: CombatState) {
			combatState = v;
		},
		setParticipants(v: string[]) {
			participants = v;
		},
		setTool(v: typeof selectedToolId) {
			selectedToolId = v;
		},
		setIsGm(v: boolean) {
			isGm = v;
		},
		setSelectedTokenId(v: string | null) {
			selectedTokenId = v;
		},
		addDiceRoll(v: DiceRollEvent) {
			diceRolls = [...diceRolls, v];
		},
		setIsTokenDragging(v: boolean) {
			isTokenDragging = v;
		},
		setFocusedTokenId(id: string | null) {
			focusedTokenId = id;
		},
		setMyCharacterSheetId(id: string | null) {
			myCharacterSheetId = id;
		},
		setCustomName(userId: string, name: string) {
			customNames[userId] = name;
		},
		get use3DDice() {
			return use3DDice;
		},
		setUse3DDice(v: boolean) {
			use3DDice = v;
		},
	};
})();
