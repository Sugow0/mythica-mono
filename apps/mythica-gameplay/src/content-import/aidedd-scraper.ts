/**
 * Scraper aidedd.org — logique partagée entre le CLI et le service d'import.
 *
 * Chaque collection a une page d'index (liste de slugs) et une page de détail
 * par slug. Le scraper extrait nom + description depuis le HTML brut.
 */

// ─── Configuration par collection ────────────────────────────────────────────

export type AideddCollection =
	| "sorts"
	| "dons"
	| "invocations"
	| "monstres"
	| "poisons"
	| "herbes"
	| "om";

/** Clé SystemContent correspondant à chaque collection aidedd. */
export const COLLECTION_KEY_MAP: Record<AideddCollection, string> = {
	sorts: "sort",
	dons: "don",
	invocations: "invocation-occulte",
	monstres: "monstre",
	poisons: "poison",
	herbes: "herbe",
	om: "objet-magique",
};

type CollectionConfig = {
	indexUrl: string;
	detailBase: string;
	/** Paramètre d'URL : "vf" (slug FR) ou "vo" (slug EN). */
	slugParam: "vf" | "vo";
};

export const AIDEDD_COLLECTIONS: Record<AideddCollection, CollectionConfig> = {
	sorts: {
		indexUrl: "https://www.aidedd.org/dnd-filters/sorts.php",
		detailBase: "https://www.aidedd.org/dnd/sorts.php",
		slugParam: "vf",
	},
	dons: {
		indexUrl: "https://www.aidedd.org/dnd-filters/dons.php",
		detailBase: "https://www.aidedd.org/dnd/dons.php",
		slugParam: "vf",
	},
	invocations: {
		indexUrl: "https://www.aidedd.org/dnd-filters/invocations-occultes.php",
		detailBase: "https://www.aidedd.org/dnd/invocations.php",
		slugParam: "vf",
	},
	monstres: {
		indexUrl: "https://www.aidedd.org/dnd-filters/monstres.php",
		detailBase: "https://www.aidedd.org/dnd/monstres.php",
		slugParam: "vf",
	},
	poisons: {
		indexUrl: "https://www.aidedd.org/regles/poisons.php",
		detailBase: "https://www.aidedd.org/dnd/poisons.php",
		slugParam: "vf",
	},
	herbes: {
		indexUrl: "https://www.aidedd.org/dnd-filters/herbs.php",
		detailBase: "https://www.aidedd.org/dnd/herbes.php",
		slugParam: "vo",
	},
	om: {
		indexUrl: "https://www.aidedd.org/dnd-filters/magic-items.php",
		detailBase: "https://www.aidedd.org/dnd/om.php",
		slugParam: "vo",
	},
};

// ─── HTTP ─────────────────────────────────────────────────────────────────────

const FETCH_HEADERS: Record<string, string> = {
	"User-Agent": "Mozilla/5.0 (compatible; Mythica-Content-Importer/1.0)",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
	Connection: "keep-alive",
};

export async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, { headers: FETCH_HEADERS });
	if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
	return res.text();
}

// ─── Extraction des slugs ─────────────────────────────────────────────────────

export function extractSlugs(html: string, param: "vf" | "vo"): string[] {
	const slugs = new Set<string>();
	const re = new RegExp(`[?&]${param}=([\\w\\-]+)`, "g");
	let m = re.exec(html);
	while (m !== null) {
		const slug = decodeURIComponent(m[1]).trim();
		if (slug) slugs.add(slug);
		m = re.exec(html);
	}
	return [...slugs].sort();
}

// ─── Extraction du contenu d'une page de détail ───────────────────────────────

function removeScripts(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ")
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&laquo;/g, "«")
		.replace(/&raquo;/g, "»")
		.replace(/&eacute;/g, "é")
		.replace(/&egrave;/g, "è")
		.replace(/&ecirc;/g, "ê")
		.replace(/&agrave;/g, "à")
		.replace(/&acirc;/g, "â")
		.replace(/&ocirc;/g, "ô")
		.replace(/&ugrave;/g, "ù")
		.replace(/&ucirc;/g, "û")
		.replace(/&icirc;/g, "î")
		.replace(/&iuml;/g, "ï")
		.replace(/&oelig;/g, "œ")
		.replace(/&aelig;/g, "æ");
}

function stripHtml(html: string): string {
	return decodeEntities(
		html
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<\/p>/gi, "\n")
			.replace(/<\/li>/gi, "\n")
			.replace(/<\/h[1-6]>/gi, "\n")
			.replace(/<\/div>/gi, "\n")
			.replace(/<[^>]+>/g, ""),
	)
		.replace(/\t/g, " ")
		.replace(/ {2,}/g, " ")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

const METADATA_RE =
	/^\s*(Temps d'incantation|Portée|Composantes?|Durée|Source|Types?|Rareté|Classe d'armure|Points de vie|Vitesse|Initiative|Puissance|Taille|Alignement|Compétences?|Résistances?|Immunités?|Sens|Langues?|Dégâts|Prérequis|Coût|Poids|Propriétés|Actions?|Réactions?|Bonus d'attaque)\s*[:.]/i;

const NAV_RE =
	/^(Accueil|DnD\s*5e?|Retour|Suivant|Précédent|Imprimer|PDF|Source\s*:)$/i;

export type ScrapedItem = {
	slug: string;
	name: string;
	description: string;
};

export function parseDetailPage(html: string, slug: string): ScrapedItem {
	const clean = removeScripts(html);

	// Nom : contenu du <h1>
	const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(clean);
	const name = h1Match ? stripHtml(h1Match[1]).trim() : slug;

	// Zone de contenu : entre </h1> et le pied de page
	const zoneMatch =
		/<\/h1>([\s\S]*?)(?:<footer\b|<div[^>]+class="[^"]*\bfooter\b|<div[^>]+id="footer|<nav\b|<\/body)/i.exec(
			clean,
		);
	const zone = zoneMatch ? zoneMatch[1] : clean;

	const lines: string[] = [];
	const pRe = /<(?:p|li|td|div)[^>]*>([\s\S]*?)<\/(?:p|li|td|div)>/gi;
	let m = pRe.exec(zone);
	while (m !== null) {
		const inner = m[1];
		if (!/<(?:div|ul|ol|table|section|article|header)\b/i.test(inner)) {
			const text = stripHtml(inner).trim();
			if (
				text.length >= 20 &&
				!METADATA_RE.test(text) &&
				!NAV_RE.test(text) &&
				!/[›‹»«]/.test(text)
			) {
				lines.push(text);
			}
		}
		m = pRe.exec(zone);
	}

	return { slug, name, description: lines.join("\n") };
}

// ─── Helpers exports ──────────────────────────────────────────────────────────

export function detailUrl(config: CollectionConfig, slug: string): string {
	return `${config.detailBase}?${config.slugParam}=${encodeURIComponent(slug)}`;
}
