import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MOCK REDIS (hash + pub/sub en mémoire) =====

const hashes = new Map<string, Map<string, number>>();
const expirations = new Map<string, number>();
const published: Array<{ channel: string; payload: string }> = [];

function hash(key: string): Map<string, number> {
	let h = hashes.get(key);
	if (!h) {
		h = new Map();
		hashes.set(key, h);
	}
	return h;
}

const redisMock = {
	hincrby: mock(async (key: string, field: string, by: number) => {
		const h = hash(key);
		const next = (h.get(field) ?? 0) + by;
		h.set(field, next);
		return next;
	}),
	hdel: mock(async (key: string, field: string) => {
		const h = hash(key);
		const had = h.delete(field);
		return had ? 1 : 0;
	}),
	hkeys: mock(async (key: string) => [...hash(key).keys()]),
	expire: mock(async (key: string, ttl: number) => {
		expirations.set(key, ttl);
		return 1;
	}),
	publish: mock(async (channel: string, payload: string) => {
		published.push({ channel, payload });
		return 1;
	}),
};

mock.module("../../../lib/redis", () => ({
	redis: redisMock,
	redisConsumer: {},
}));

const {
	presenceChannel,
	presenceKey,
	listPresence,
	joinPresence,
	leavePresence,
	announceStatus,
	PRESENCE_TTL_SECONDS,
} =
	require("./session-presence.handler") as typeof import("./session-presence.handler");

const SID = "55555555-5555-5555-5555-555555555555";
const ALICE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function lastPayload() {
	return JSON.parse(published[published.length - 1].payload) as {
		users: string[];
		status?: string;
	};
}

beforeEach(() => {
	hashes.clear();
	expirations.clear();
	published.length = 0;
});

describe("session-presence helpers", () => {
	it("nomme le canal et la clé par session", () => {
		expect(presenceChannel(SID)).toBe(`session:${SID}:presence`);
		expect(presenceKey(SID)).toBe(`session:${SID}:presence:members`);
	});

	it("joinPresence enregistre l'utilisateur et publie la liste", async () => {
		const users = await joinPresence(SID, ALICE);
		expect(users).toEqual([ALICE]);
		expect(await listPresence(SID)).toEqual([ALICE]);
		// Publie sur le canal de la session.
		const evt = published.at(-1);
		expect(evt?.channel).toBe(presenceChannel(SID));
		expect(lastPayload().users).toEqual([ALICE]);
		// Pose un TTL pour éviter les fuites de clés orphelines.
		expect(expirations.get(presenceKey(SID))).toBe(PRESENCE_TTL_SECONDS);
	});

	it("dédoublonne les connexions multiples d'un même utilisateur", async () => {
		await joinPresence(SID, ALICE);
		await joinPresence(SID, ALICE);
		expect(await listPresence(SID)).toEqual([ALICE]);
		// Une seule déconnexion laisse l'utilisateur présent (autre onglet ouvert).
		await leavePresence(SID, ALICE);
		expect(await listPresence(SID)).toEqual([ALICE]);
		// La dernière déconnexion le retire.
		await leavePresence(SID, ALICE);
		expect(await listPresence(SID)).toEqual([]);
	});

	it("gère plusieurs utilisateurs et publie à chaque changement", async () => {
		await joinPresence(SID, ALICE);
		await joinPresence(SID, BOB);
		expect((await listPresence(SID)).sort()).toEqual([ALICE, BOB].sort());
		await leavePresence(SID, ALICE);
		expect(await listPresence(SID)).toEqual([BOB]);
		expect(lastPayload().users).toEqual([BOB]);
	});

	it("announceStatus publie la liste avec le statut", async () => {
		await joinPresence(SID, ALICE);
		await announceStatus(SID, "active");
		const payload = lastPayload();
		expect(payload.status).toBe("active");
		expect(payload.users).toEqual([ALICE]);
	});

	it("leavePresence ne descend jamais sous zéro", async () => {
		// Déconnexion sans connexion préalable : pas d'erreur, liste vide.
		const users = await leavePresence(SID, ALICE);
		expect(users).toEqual([]);
		expect(await listPresence(SID)).toEqual([]);
	});
});
