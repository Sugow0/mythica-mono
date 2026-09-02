import type Redis from "ioredis";
import { redis } from "../lib/redis";

/**
 * Gestion des rooms WebSocket par session de jeu.
 *
 * Chaque instance conserve une `Map<sessionId, Set<socket>>` de ses sockets
 * locaux. La diffusion passe par un canal Redis pub/sub par session : ainsi un
 * message émis sur une instance atteint aussi les sockets des autres instances
 * (scalabilité horizontale). Le canal est l'unique chemin de livraison, donc
 * chaque socket reçoit le message exactement une fois.
 */

const ROOM_PREFIX = "session:";
const ROOM_SUFFIX = ":room";

/** Canal Redis pub/sub de la room d'une session. */
export function roomChannel(sessionId: string): string {
	return `${ROOM_PREFIX}${sessionId}${ROOM_SUFFIX}`;
}

function sessionFromChannel(channel: string): string {
	return channel.slice(ROOM_PREFIX.length, channel.length - ROOM_SUFFIX.length);
}

/** Interface minimale d'un socket destinataire (facilite les tests). */
export type RoomSocket = { send(data: string): void };

type RedisLike = Pick<Redis, "duplicate" | "publish">;

export function createRoomManager(client: RedisLike) {
	const rooms = new Map<string, Set<RoomSocket>>();
	const subscribedChannels = new Set<string>();
	let subscriber: ReturnType<RedisLike["duplicate"]> | null = null;

	function deliverLocal(sessionId: string, payload: string): void {
		const set = rooms.get(sessionId);
		if (!set) return;
		for (const socket of set) socket.send(payload);
	}

	function ensureSubscriber() {
		if (subscriber) return subscriber;
		subscriber = client.duplicate();
		subscriber.on("message", (channel: string, payload: string) => {
			deliverLocal(sessionFromChannel(channel), payload);
		});
		return subscriber;
	}

	/** Inscrit un socket dans la room et s'abonne au canal Redis si nécessaire. */
	async function joinRoom(
		sessionId: string,
		socket: RoomSocket,
	): Promise<void> {
		let set = rooms.get(sessionId);
		if (!set) {
			set = new Set();
			rooms.set(sessionId, set);
		}
		set.add(socket);

		const channel = roomChannel(sessionId);
		if (!subscribedChannels.has(channel)) {
			subscribedChannels.add(channel);
			await ensureSubscriber().subscribe(channel);
		}
	}

	/** Retire un socket ; se désabonne du canal quand la room locale est vide. */
	async function leaveRoom(
		sessionId: string,
		socket: RoomSocket,
	): Promise<void> {
		const set = rooms.get(sessionId);
		if (!set) return;
		set.delete(socket);
		if (set.size > 0) return;

		rooms.delete(sessionId);
		const channel = roomChannel(sessionId);
		subscribedChannels.delete(channel);
		if (subscriber) {
			await subscriber.unsubscribe(channel).catch(() => {});
		}
	}

	/** Diffuse un message à tous les sockets de la room (toutes instances). */
	async function broadcast(sessionId: string, message: unknown): Promise<void> {
		const payload = JSON.stringify(message, (_, value) =>
			typeof value === "bigint" ? value.toString() : value,
		);
		await client.publish(roomChannel(sessionId), payload);
	}

	/** Nombre de sockets connectés à la room sur cette instance. */
	function localRoomSize(sessionId: string): number {
		return rooms.get(sessionId)?.size ?? 0;
	}

	return { joinRoom, leaveRoom, broadcast, localRoomSize };
}

/** Gestionnaire de rooms partagé par le serveur WebSocket gameplay. */
export const sessionRooms = createRoomManager(redis);
