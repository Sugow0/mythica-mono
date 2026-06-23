import { describe, expect, it } from "bun:test";
import { extractSlugs, parseDetailPage } from "../aidedd-scraper";

// ─── extractSlugs ─────────────────────────────────────────────────────────────

describe("extractSlugs", () => {
	it("extrait les slugs vf depuis une page index", () => {
		const html = `
      <a href="/dnd/dons.php?vf=alerte">Alerte</a>
      <a href="/dnd/dons.php?vf=sentinelle">Sentinelle</a>
      <a href="/dnd/dons.php?vf=chanceux">Chanceux</a>
    `;
		expect(extractSlugs(html, "vf")).toEqual([
			"alerte",
			"chanceux",
			"sentinelle",
		]);
	});

	it("extrait les slugs vo depuis une page index", () => {
		const html = `
      <a href="/dnd/om.php?vo=vorpal-sword">Epée vorpale</a>
      <a href="/dnd/om.php?vo=bag-of-holding">Sac sans fond</a>
    `;
		expect(extractSlugs(html, "vo")).toEqual([
			"bag-of-holding",
			"vorpal-sword",
		]);
	});

	it("déduplique les slugs", () => {
		const html = `
      <a href="?vf=alerte">1</a>
      <a href="?vf=alerte">2</a>
      <a href="?vf=chanceux">3</a>
    `;
		expect(extractSlugs(html, "vf")).toHaveLength(2);
	});

	it("retourne un tableau vide si aucun slug", () => {
		expect(extractSlugs("<div>rien</div>", "vf")).toEqual([]);
	});

	it("ignore le paramètre opposé", () => {
		const html = `<a href="?vo=bag-of-holding">objet</a>`;
		expect(extractSlugs(html, "vf")).toEqual([]);
	});
});

// ─── parseDetailPage ──────────────────────────────────────────────────────────

describe("parseDetailPage", () => {
	it("extrait le nom depuis le h1", () => {
		const html = `
      <html><body>
        <h1>Sentinelle</h1>
        <p>Vos attaques d'opportunité réduisent la vitesse de la cible.</p>
        <footer>nav</footer>
      </body></html>
    `;
		const { name } = parseDetailPage(html, "sentinelle");
		expect(name).toBe("Sentinelle");
	});

	it("utilise le slug comme fallback si pas de h1", () => {
		const html = `<html><body><p>Contenu sans titre</p></body></html>`;
		const { name } = parseDetailPage(html, "mon-don");
		expect(name).toBe("mon-don");
	});

	it("extrait la description depuis les paragraphes", () => {
		const html = `
      <html><body>
        <h1>Chanceux</h1>
        <p>Vous avez une chance inexplicable qui semble tomber juste au bon moment.</p>
        <p>Vous avez 3 points de chance utilisables pour relancer des dés.</p>
        <footer>pied de page</footer>
      </body></html>
    `;
		const { description } = parseDetailPage(html, "chanceux");
		expect(description).toContain("chance inexplicable");
		expect(description).toContain("3 points de chance");
	});

	it("supprime les balises script et style", () => {
		const html = `
      <html><head>
        <script>function gtag(){dataLayer.push(arguments);}</script>
        <style>body{color:red}</style>
      </head><body>
        <h1>Alerte</h1>
        <p>Vous avez un bonus de +5 à l'initiative et ne pouvez pas être surpris.</p>
        <footer>nav</footer>
      </body></html>
    `;
		const { description } = parseDetailPage(html, "alerte");
		expect(description).not.toContain("gtag");
		expect(description).not.toContain("dataLayer");
		expect(description).toContain("bonus de +5");
	});

	it("filtre les breadcrumbs avec le caractère ›", () => {
		const html = `
      <html><body>
        <h1>Sentinelle</h1>
        <p>Dons D&amp;D 5 › Sentinelle</p>
        <p>Vos attaques d'opportunité réduisent la vitesse de la cible à 0.</p>
        <footer>nav</footer>
      </body></html>
    `;
		const { description } = parseDetailPage(html, "sentinelle");
		expect(description).not.toContain("›");
		expect(description).toContain("vitesse de la cible");
	});

	it("ignore les lignes de métadonnées", () => {
		const html = `
      <html><body>
        <h1>Absorption des éléments</h1>
        <p>Temps d'incantation: 1 réaction</p>
        <p>Portée: personnelle</p>
        <p>Le sort absorbe l'énergie élémentaire de l'attaque pour vous protéger.</p>
        <footer>nav</footer>
      </body></html>
    `;
		const { description } = parseDetailPage(html, "absorption-des-elements");
		expect(description).not.toContain("Temps d'incantation");
		expect(description).not.toContain("Portée");
		expect(description).toContain("absorbe l'énergie");
	});

	it("retourne une description vide si aucun paragraphe substantiel", () => {
		const html = `<html><body><h1>Vide</h1></body></html>`;
		const { description } = parseDetailPage(html, "vide");
		expect(description).toBe("");
	});
});
