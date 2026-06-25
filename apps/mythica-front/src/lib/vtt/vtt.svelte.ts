// apps/mythica-front/src/lib/vtt/vtt.svelte.ts
import type {
	CombatState,
	FogState,
	MapConfig,
	SessionTokenDto,
} from "./types";

export const vttState = (() => {
	let tokens = $state<SessionTokenDto[]>([]);
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
		"select" | "move" | "fog-paint" | "fog-erase" | "add-token"
	>("select");
	let selectedTokenId = $state<string | null>(null);
	let isGm = $state(false);

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

		setTokens(v: SessionTokenDto[]) {
			tokens = v;
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
	};
})();
