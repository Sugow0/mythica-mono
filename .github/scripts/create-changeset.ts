#!/usr/bin/env bun

/**
 * Crée un fichier changeset à partir du nom de branche et du ticket Notion associé.
 * Idempotent : ne recrée pas si un changeset pour ce ticket existe déjà.
 *
 * Usage:
 *   bun .github/scripts/create-changeset.ts <branchName> <baseBranch>
 *   ex: bun .github/scripts/create-changeset.ts feature/FEAT-1 staging
 *
 * Env vars requis:
 *   NOTION_TOKEN
 *   NOTION_DATABASE_ID
 *   NOTION_STATUS_PROPERTY (défaut: "Status")
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const token = process.env.NOTION_TOKEN ?? "";
const featuresDatabaseId = process.env.NOTION_FEATURES_DATABASE_ID ?? "";
const ticketsDatabaseId = process.env.NOTION_TICKETS_DATABASE_ID ?? "";

if (!token || !featuresDatabaseId || !ticketsDatabaseId) {
	console.error(
		"❌ NOTION_TOKEN, NOTION_FEATURES_DATABASE_ID et NOTION_TICKETS_DATABASE_ID sont requis",
	);
	process.exit(1);
}

const [branchName, baseBranch = "staging"] = process.argv.slice(2);

if (!branchName) {
	console.error("Usage: create-changeset.ts <branchName> [baseBranch]");
	process.exit(1);
}

// --- 1. Parser le nom de branche ---
const BRANCH_REGEX = /^(feature|fix|chore|refactor|docs)\/([A-Z]+-\d+)/;
const branchMatch = branchName.match(BRANCH_REGEX);

if (!branchMatch) {
	console.log(
		`ℹ️  Branche "${branchName}" sans ticket ID → aucun changeset créé`,
	);
	process.exit(0);
}

const branchType = branchMatch[1];
const ticketId = branchMatch[2]; // ex: FEAT-1
const bumpType = branchType === "feature" ? "minor" : "patch";

// --- 2. Idempotence : vérifier si un changeset pour ce ticket existe déjà ---
const changesetDir = ".changeset";
const existingFiles = existsSync(changesetDir)
	? readdirSync(changesetDir).filter((f) => f.endsWith(".md"))
	: [];
const alreadyExists = existingFiles.some((f) => f.includes(ticketId));

if (alreadyExists) {
	console.log(`ℹ️  Changeset pour ${ticketId} existe déjà → aucune action`);
	process.exit(0);
}

// --- 3. Détecter les packages modifiés ---
const PACKAGE_MAP: Record<string, string> = {
	"apps/mythica-api": "@mythica/api",
	"apps/mythica-gateway": "@mythica/gateway",
	"apps/mythica-gameplay": "@mythica/gameplay",
	"apps/mythica-front": "@mythica/front",
	"apps/mythica-mobile": "@mythica/mobile",
};

function detectModifiedPackages(): string[] {
	try {
		const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
			encoding: "utf8",
		});
		const files = diff.trim().split("\n").filter(Boolean);
		const touched = new Set<string>();

		for (const file of files) {
			for (const [appPath, packageName] of Object.entries(PACKAGE_MAP)) {
				if (file.startsWith(appPath)) {
					touched.add(packageName);
				}
			}
		}

		return touched.size > 0 ? Array.from(touched) : Object.values(PACKAGE_MAP);
	} catch {
		console.warn("⚠️  Impossible de détecter les packages → on bumpe tous");
		return Object.values(PACKAGE_MAP);
	}
}

const packages = detectModifiedPackages();
console.log(`📦 Packages détectés : ${packages.join(", ")}`);

// --- 4. Fetch ticket Notion ---
const ticketNumber = parseInt(ticketId.split("-")[1], 10);
const headers = {
	Authorization: `Bearer ${token}`,
	"Notion-Version": NOTION_VERSION,
	"Content-Type": "application/json",
};

type NotionRichText = { plain_text: string };
type NotionPage = {
	id: string;
	properties: {
		Name?: { title: NotionRichText[] };
		[key: string]: unknown;
	};
};
type NotionBlock = {
	type: string;
	paragraph?: { rich_text: NotionRichText[] };
	heading_1?: { rich_text: NotionRichText[] };
	heading_2?: { rich_text: NotionRichText[] };
	heading_3?: { rich_text: NotionRichText[] };
	bulleted_list_item?: { rich_text: NotionRichText[] };
};

async function queryDatabase(dbId: string): Promise<NotionPage | null> {
	const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			filter: {
				property: "ID",
				unique_id: { equals: ticketNumber },
			},
		}),
	});
	if (!res.ok) return null;
	const data = (await res.json()) as { results: NotionPage[] };
	return data.results[0] ?? null;
}

async function fetchTicket(): Promise<{
	title: string;
	description: string;
} | null> {
	// Cherche d'abord dans la DB Tickets, fallback sur Features
	const page =
		(await queryDatabase(ticketsDatabaseId)) ??
		(await queryDatabase(featuresDatabaseId));

	if (!page) {
		console.warn(`⚠️  Ticket ${ticketId} introuvable dans Notion`);
		return null;
	}

	const title =
		page.properties.Name?.title.map((t) => t.plain_text).join("") ?? ticketId;

	// Fetch les blocs de contenu pour la description
	const blocksRes = await fetch(
		`${NOTION_API}/blocks/${page.id}/children?page_size=10`,
		{ headers },
	);

	let description = "";
	if (blocksRes.ok) {
		const blocksData = (await blocksRes.json()) as {
			results: NotionBlock[];
		};
		description = blocksData.results
			.map((block) => {
				const richText =
					block.paragraph?.rich_text ??
					block.heading_1?.rich_text ??
					block.heading_2?.rich_text ??
					block.heading_3?.rich_text ??
					block.bulleted_list_item?.rich_text ??
					[];
				return richText.map((t) => t.plain_text).join("");
			})
			.filter(Boolean)
			.slice(0, 3) // max 3 premiers blocs
			.join("\n");
	}

	return { title, description };
}

const ticket = await fetchTicket();
const title = ticket?.title ?? ticketId;
const description = ticket?.description ?? "";

// --- 5. Générer le fichier changeset ---
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const filename = `${changesetDir}/${timestamp}-${ticketId}.md`;

const frontmatter = packages.map((pkg) => `"${pkg}": ${bumpType}`).join("\n");

const body = [
	"---",
	frontmatter,
	"---",
	"",
	`[${ticketId}] ${title}`,
	...(description ? ["", description] : []),
	"",
	`_Généré automatiquement le ${new Date().toISOString()}_`,
].join("\n");

writeFileSync(filename, body);
console.log(`✅ Changeset créé : ${filename}`);
console.log(`   Ticket : [${ticketId}] ${title}`);
console.log(`   Bump   : ${bumpType}`);
