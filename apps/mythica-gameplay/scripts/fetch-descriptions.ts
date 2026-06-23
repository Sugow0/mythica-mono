#!/usr/bin/env bun
/**
 * CLI d'import de descriptions depuis aidedd.org → fichiers TypeScript statiques.
 *
 * Usage:
 *   bun run scripts/fetch-descriptions.ts <collection> [--dry-run]
 *
 * Collections: sorts | dons | invocations | monstres | poisons | herbes | om
 *
 * --dry-run  : liste les slugs sans rien fetch ni écrire.
 *
 * Le cache JSON (scripts/.cache-<collection>.json) permet de reprendre
 * un scan interrompu sans re-fetcher les pages déjà traitées.
 *
 * Pour un import interactif avec review dans l'admin, utiliser le service
 * backend (src/content-import/content-import.service.ts).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
	AIDEDD_COLLECTIONS,
	detailUrl,
	extractSlugs,
	fetchHtml,
	parseDetailPage,
} from "../src/content-import/aidedd-scraper";

// ─── Config output par collection ─────────────────────────────────────────────

const OUTPUT_CONFIG: Record<
	string,
	{ outputFile: string; exportName: string }
> = {
	sorts: {
		outputFile: "spell-descriptions.ts",
		exportName: "SPELL_DESCRIPTIONS",
	},
	dons: { outputFile: "dons-descriptions.ts", exportName: "DON_DESCRIPTIONS" },
	invocations: {
		outputFile: "invocations-descriptions.ts",
		exportName: "INVOCATION_DESCRIPTIONS",
	},
	monstres: {
		outputFile: "monstres-descriptions.ts",
		exportName: "MONSTRE_DESCRIPTIONS",
	},
	poisons: {
		outputFile: "poisons-descriptions.ts",
		exportName: "POISON_DESCRIPTIONS",
	},
	herbes: {
		outputFile: "herbes-descriptions.ts",
		exportName: "HERBE_DESCRIPTIONS",
	},
	om: { outputFile: "om-descriptions.ts", exportName: "OM_DESCRIPTIONS" },
};

// ─── Génération TypeScript ────────────────────────────────────────────────────

function generateTs(
	exportName: string,
	collection: string,
	data: Record<string, string>,
): string {
	const entries = Object.entries(data)
		.sort(([a], [b]) => a.localeCompare(b, "fr"))
		.map(([slug, desc]) => {
			const escaped = desc
				.replace(/\\/g, "\\\\")
				.replace(/`/g, "\\`")
				.replace(/\$\{/g, "\\${");
			return `\t"${slug}":\n\t\t\`${escaped}\``;
		})
		.join(",\n");

	return `/**
 * Descriptions ${collection} D&D 5e (texte FR), importées d'aidedd.org.
 * Générées par scripts/fetch-descriptions.ts ; ne pas éditer à la main.
 */

export const ${exportName}: Record<string, string> = {
${entries},
};
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DELAY_MS = 450;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
	const args = process.argv.slice(2);
	const collection = args.find((a) => !a.startsWith("--"));
	const dryRun = args.includes("--dry-run");

	if (
		!collection ||
		!AIDEDD_COLLECTIONS[collection as keyof typeof AIDEDD_COLLECTIONS]
	) {
		console.error(
			"Usage: bun run scripts/fetch-descriptions.ts <collection> [--dry-run]",
		);
		console.error(
			`Collections : ${Object.keys(AIDEDD_COLLECTIONS).join(" | ")}`,
		);
		process.exit(1);
	}

	const outputCfg = OUTPUT_CONFIG[collection];
	const config =
		AIDEDD_COLLECTIONS[collection as keyof typeof AIDEDD_COLLECTIONS];

	const scriptDir = dirname(new URL(import.meta.url).pathname);
	const outDir = join(scriptDir, "..", "src", "game-systems", "dnd5e-2014");
	const outPath = join(outDir, outputCfg.outputFile);
	const cachePath = join(scriptDir, `.cache-${collection}.json`);

	// ── Cache ──────────────────────────────────────────────────────────────────
	let cache: Record<string, string> = {};
	if (existsSync(cachePath)) {
		cache = JSON.parse(readFileSync(cachePath, "utf-8")) as Record<
			string,
			string
		>;
		console.log(`[cache] ${Object.keys(cache).length} entrées chargées`);
	}

	// ── Index ──────────────────────────────────────────────────────────────────
	console.log(`[index] ${config.indexUrl}`);
	const indexHtml = await fetchHtml(config.indexUrl);
	const slugs = extractSlugs(indexHtml, config.slugParam);

	if (slugs.length === 0) {
		console.error(
			"[index] Aucun slug trouvé — vérifier l'URL ou la regex d'extraction",
		);
		console.error("[debug] HTML (500 chars):", indexHtml.slice(0, 500));
		process.exit(1);
	}

	console.log(`[index] ${slugs.length} slugs trouvés`);

	if (dryRun) {
		console.log("\n--- Slugs (dry-run) ---");
		for (const s of slugs) console.log(" ", s);
		return;
	}

	// ── Fetch détails ──────────────────────────────────────────────────────────
	let fetched = 0;
	let skipped = 0;
	let failed = 0;

	for (let i = 0; i < slugs.length; i++) {
		const slug = slugs[i];
		const progress = `[${String(i + 1).padStart(String(slugs.length).length)}/${slugs.length}]`;

		if (cache[slug] !== undefined) {
			skipped++;
			process.stdout.write(`${progress} [skip] ${slug}\n`);
			continue;
		}

		try {
			const url = detailUrl(config, slug);
			const html = await fetchHtml(url);
			const item = parseDetailPage(html, slug);

			cache[slug] = item.description;
			writeFileSync(cachePath, JSON.stringify(cache, null, 2));

			if (item.description) {
				fetched++;
				process.stdout.write(
					`${progress} [ok]   ${slug} (${item.description.length} chars)\n`,
				);
			} else {
				failed++;
				process.stdout.write(`${progress} [vide] ${slug}\n`);
			}
		} catch (e) {
			failed++;
			process.stdout.write(
				`${progress} [err]  ${slug}: ${(e as Error).message}\n`,
			);
		}

		await delay(DELAY_MS);
	}

	// ── Génération ─────────────────────────────────────────────────────────────
	const result: Record<string, string> = {};
	for (const slug of slugs) {
		if (cache[slug]) result[slug] = cache[slug];
	}

	mkdirSync(outDir, { recursive: true });
	writeFileSync(outPath, generateTs(outputCfg.exportName, collection, result));

	console.log(`
╔══════════════════════════════════════╗
  ${collection} — terminé
  Fetched  : ${fetched}
  Ignorés  : ${skipped} (cache)
  Échecs   : ${failed}
  Sortie   : ${outPath}
╚══════════════════════════════════════╝`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
