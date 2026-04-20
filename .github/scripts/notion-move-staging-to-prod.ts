#!/usr/bin/env bun
/**
 * Passe tous les tickets Notion en statut "Staging" vers "Production".
 * Appelé lors du merge staging → main.
 *
 * Env vars requis:
 *   NOTION_TOKEN
 *   NOTION_DATABASE_ID
 *   NOTION_STATUS_PROPERTY (défaut: "Status")
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

const headers = {
	Authorization: `Bearer ${token}`,
	"Notion-Version": NOTION_VERSION,
	"Content-Type": "application/json",
};

async function findStagingPages(): Promise<string[]> {
	const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			filter: {
				property: statusProperty,
				status: { equals: "Staging" },
			},
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		console.error(`❌ Erreur Notion query: ${res.status} ${err}`);
		process.exit(1);
	}

	const data = (await res.json()) as { results: Array<{ id: string }> };
	return data.results.map((p) => p.id);
}

async function updateStatus(pageId: string): Promise<void> {
	const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
		method: "PATCH",
		headers,
		body: JSON.stringify({
			properties: {
				[statusProperty]: {
					status: { name: "Production" },
				},
			},
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		console.error(`❌ Erreur update page ${pageId}: ${res.status} ${err}`);
	}
}

const pageIds = await findStagingPages();

if (pageIds.length === 0) {
	console.log("ℹ️  Aucun ticket en Staging à promouvoir");
	process.exit(0);
}

console.log(`📦 ${pageIds.length} ticket(s) Staging → Production`);
await Promise.all(pageIds.map(updateStatus));
console.log("✅ Tous les tickets sont passés en Production");
