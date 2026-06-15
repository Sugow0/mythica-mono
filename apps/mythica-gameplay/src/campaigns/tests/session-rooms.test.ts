import { beforeEach, describe, expect, it, mock } from "bun:test";

// Pas de connexion réseau : on instancie le manager avec un broker en mémoire.
mock.module("../../lib/redis", () => ({ redis: {}, redisConsumer: {} }));

const { createRoomManager, roomChannel } =
	require("../session-rooms") as typeof import("../session-rooms");

/** Broker pub/sub en mémoire partageable entre plusieurs managers (instances). */
function createBroker() {
	type Conn = {
		channels: Set<string>;
		onMessage?: (c: string, p: string) => void;
	};
	const conns: Conn[] = [];
	return {
		duplicate() {
			const conn: Conn = { channels: new Set() };
			conns.push(conn);
			return {
				on(event: string, cb: (c: string, p: string) => void) {
					if (event === "message") conn.onMessage = cb;
				},
				async subscribe(ch: string) {
					conn.channels.add(ch);
				},
				async unsubscribe(ch: string) {
					conn.channels.delete(ch);
				},
			};
		},
		async publish(channel: string, payload: string) {
			let n = 0;
			for (const c of conns) {
				if (c.channels.has(channel) && c.onMessage) {
					c.onMessage(channel, payload);
					n++;
				}
			}
			return n;
		},
	};
}

function socket() {
	const received: string[] = [];
	return { received, send: (d: string) => received.push(d) };
}

const SID = "55555555-5555-5555-5555-555555555555";
const OTHER = "66666666-6666-6666-6666-666666666666";

let broker: ReturnType<typeof createBroker>;
let mgr: ReturnType<typeof createRoomManager>;
beforeEach(() => {
	broker = createBroker();
	mgr = createRoomManager(broker);
});

describe("roomChannel", () => {
	it("nomme le canal par session", () => {
		expect(roomChannel(SID)).toBe(`session:${SID}:room`);
	});
});

describe("createRoomManager", () => {
	it("diffuse aux sockets de la room", async () => {
		const a = socket();
		const b = socket();
		await mgr.joinRoom(SID, a);
		await mgr.joinRoom(SID, b);
		await mgr.broadcast(SID, { type: "ping" });
		expect(a.received).toEqual(['{"type":"ping"}']);
		expect(b.received).toEqual(['{"type":"ping"}']);
	});

	it("isole les rooms entre sessions", async () => {
		const a = socket();
		const other = socket();
		await mgr.joinRoom(SID, a);
		await mgr.joinRoom(OTHER, other);
		await mgr.broadcast(SID, { x: 1 });
		expect(a.received).toHaveLength(1);
		expect(other.received).toHaveLength(0);
	});

	it("suit la taille locale de la room", async () => {
		const a = socket();
		const b = socket();
		expect(mgr.localRoomSize(SID)).toBe(0);
		await mgr.joinRoom(SID, a);
		await mgr.joinRoom(SID, b);
		expect(mgr.localRoomSize(SID)).toBe(2);
		await mgr.leaveRoom(SID, a);
		expect(mgr.localRoomSize(SID)).toBe(1);
	});

	it("ne livre plus après leaveRoom", async () => {
		const a = socket();
		await mgr.joinRoom(SID, a);
		await mgr.leaveRoom(SID, a);
		await mgr.broadcast(SID, { x: 1 });
		expect(a.received).toHaveLength(0);
		expect(mgr.localRoomSize(SID)).toBe(0);
	});

	it("leaveRoom est sans effet sur une room inconnue", async () => {
		const a = socket();
		await expect(mgr.leaveRoom(SID, a)).resolves.toBeUndefined();
	});

	it("diffuse entre instances via le broker partagé", async () => {
		const mgrB = createRoomManager(broker); // 2e instance, même Redis
		const a = socket();
		const b = socket();
		await mgr.joinRoom(SID, a); // instance A
		await mgrB.joinRoom(SID, b); // instance B
		await mgr.broadcast(SID, { type: "cross" });
		// Le socket de l'autre instance reçoit aussi (fan-out Redis).
		expect(a.received).toEqual(['{"type":"cross"}']);
		expect(b.received).toEqual(['{"type":"cross"}']);
	});
});
