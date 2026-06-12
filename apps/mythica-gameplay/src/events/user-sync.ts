import { redisConsumer } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { logger } from "../logger";

const STREAM_KEY = "mythica:events:users";
const GROUP_NAME = "gameplay";
const CONSUMER_NAME = "gameplay-1";
const BLOCK_MS = 5000;
const BATCH_SIZE = 10;

type StreamMessage = [id: string, fields: string[]];
type StreamEntry = [streamName: string, messages: StreamMessage[]];

/**
 * Parse les champs d'un message Redis Stream (tableau plat clé/valeur alternés)
 * en objet.
 */
function parseFields(fields: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (let i = 0; i < fields.length; i += 2) {
		result[fields[i]] = fields[i + 1];
	}
	return result;
}

/**
 * Traite un event utilisateur reçu du stream.
 */
async function handleUserEvent(
	fields: Record<string, string>,
): Promise<void> {
	const { type, userId } = fields;

	if (type === "user.created") {
		await prisma.user.upsert({
			where: { id: userId },
			create: { id: userId },
			update: {},
		});
		logger.info({ userId }, "user.created: miroir créé dans gameplay");
		return;
	}

	if (type === "user.deleted") {
		await prisma.user.deleteMany({ where: { id: userId } });
		logger.info({ userId }, "user.deleted: miroir supprimé dans gameplay");
		return;
	}

	logger.warn({ type, userId }, "event utilisateur inconnu, ignoré");
}

/**
 * Rattrape les messages pending (reçus mais non ackés lors d'un crash précédent).
 */
async function processPendingMessages(): Promise<void> {
	while (true) {
		const results = (await redisConsumer.xreadgroup(
			"GROUP", GROUP_NAME, CONSUMER_NAME,
			"COUNT", String(BATCH_SIZE),
			"STREAMS", STREAM_KEY,
			"0", // "0" = messages pending non ackés
		)) as StreamEntry[] | null;

		if (!results || results[0][1].length === 0) break;

		const messages = results[0][1];
		for (const [id, fields] of messages) {
			try {
				await handleUserEvent(parseFields(fields));
				await redisConsumer.xack(STREAM_KEY, GROUP_NAME, id);
			} catch (err) {
				logger.error({ err, id }, "Erreur traitement message pending");
			}
		}
	}
}

/**
 * Boucle principale du consumer.
 * Écoute en continu les nouveaux events avec XREADGROUP BLOCK.
 */
async function consumeLoop(): Promise<void> {
	while (true) {
		try {
			const results = (await redisConsumer.xreadgroup(
				"GROUP", GROUP_NAME, CONSUMER_NAME,
				"COUNT", String(BATCH_SIZE),
				"BLOCK", String(BLOCK_MS),
				"STREAMS", STREAM_KEY,
				">", // ">" = uniquement les nouveaux messages non délivrés
			)) as StreamEntry[] | null;

			if (!results) continue; // timeout BLOCK, pas de nouveaux messages

			const messages = results[0][1];
			for (const [id, fields] of messages) {
				try {
					await handleUserEvent(parseFields(fields));
					await redisConsumer.xack(STREAM_KEY, GROUP_NAME, id);
				} catch (err) {
					logger.error({ err, id }, "Erreur traitement message, sera retraité");
					// Pas de xack → le message reste pending et sera retraité
				}
			}
		} catch (err) {
			logger.error({ err }, "Erreur consumer, reprise dans 5s");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
}

/**
 * Initialise le consumer group et démarre l'écoute du stream.
 * À appeler une fois au démarrage du service.
 */
export async function startUserSync(): Promise<void> {
	// Crée le consumer group s'il n'existe pas encore
	// "$" = ne lire que les nouveaux messages (pas l'historique)
	// MKSTREAM = crée le stream s'il n'existe pas
	try {
		await redisConsumer.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "$", "MKSTREAM");
		logger.info("Consumer group 'gameplay' créé");
	} catch (err: unknown) {
		// BUSYGROUP = le groupe existe déjà, c'est normal
		if (err instanceof Error && err.message.includes("BUSYGROUP")) {
			logger.info("Consumer group 'gameplay' déjà existant");
		} else {
			throw err;
		}
	}

	// Rattraper les messages pending d'un crash précédent
	await processPendingMessages();

	// Démarrer la boucle principale en arrière-plan (non bloquant)
	consumeLoop().catch((err) => {
		logger.error({ err }, "Consumer user-sync arrêté de manière inattendue");
		process.exit(1);
	});

	logger.info("User sync démarré — écoute sur mythica:events:users");
}
