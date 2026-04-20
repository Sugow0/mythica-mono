#!/usr/bin/env bun
/**
 * Met à jour le statut d'un ticket Notion à partir de son ID (ex: FEAT-1).
 *
 * Usage:
 *   bun .github/scripts/notion-update-status.ts <ticketId> <status>
 *   ex: bun .github/scripts/notion-update-status.ts FEAT-1 "En cours"
 *
 * Env vars requis:
 *   NOTION_TOKEN          - Integration token Notion
 *   NOTION_DATABASE_ID    - ID de la base de données Features
 *   NOTION_STATUS_PROPERTY - Nom de la propriété statut (défaut: "Status")
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_FEATURES_DATABASE_ID;
const statusProperty = process.env.NOTION_STATUS_PROPERTY ?? "Status";

if (!token || !databaseId) {
	console.error("❌ NOTION_TOKEN et NOTION_FEATURES_DATABASE_ID sont requis");
	process.exit(1);
}

const [ticketId, status] = process.argv.slice(2);

if (!ticketId || !status) {
	console.error("Usage: notion-update-status.ts <ticketId> <status>");
	console.error("  ex: notion-update-status.ts FEAT-1 'En cours'");
	process.exit(1);
}

// Parser "FEAT-1" → { prefix: "FEAT", number: 1 }
const match = ticketId.match(/^([A-Z]+)-(\d+)$/);
if (!match) {
	console.error(`❌ Format de ticket invalide: ${ticketId} (attendu: FEAT-1)`);
	process.exit(1);
}
const ticketNumber = parseInt(match[2], 10);

const headers = {
	Authorization: `Bearer ${token}`,
	"Notion-Version": NOTION_VERSION,
	"Content-Type": "application/json",
};

async function findPage(): Promise<string | null> {
	const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			filter: {
				property: "ID",
				unique_id: { equals: ticketNumber },
			},
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		console.error(`❌ Erreur Notion query: ${res.status} ${err}`);
		return null;
	}

	const data = (await res.json()) as { results: Array<{ id: string }> };
	if (data.results.length === 0) {
		console.warn(`⚠️  Aucun ticket trouvé pour ${ticketId}`);
		return null;
	}

	return data.results[0].id;
}

async function updateStatus(pageId: string): Promise<void> {
	const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
		method: "PATCH",
		headers,
		body: JSON.stringify({
			properties: {
				[statusProperty]: {
					status: { name: status },
				},
			},
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		console.error(`❌ Erreur Notion update: ${res.status} ${err}`);
		process.exit(1);
	}
}

const pageId = await findPage();
if (!pageId) process.exit(0); // ticket introuvable → pas d'erreur CI

await updateStatus(pageId);
console.log(`✅ Ticket ${ticketId} → "${status}"`);
