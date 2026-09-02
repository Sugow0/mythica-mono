import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
	it("retourne une chaîne vide pour une entrée vide", () => {
		expect(renderMarkdown("")).toBe("");
	});

	it("rend le gras, l'italique et le code", () => {
		expect(renderMarkdown("**gras**")).toBe("<p><strong>gras</strong></p>");
		expect(renderMarkdown("*ital*")).toBe("<p><em>ital</em></p>");
		expect(renderMarkdown("`code`")).toBe("<p><code>code</code></p>");
	});

	it("rend les titres", () => {
		expect(renderMarkdown("# Titre")).toBe("<h1>Titre</h1>");
		expect(renderMarkdown("### Petit")).toBe("<h3>Petit</h3>");
	});

	it("rend les listes", () => {
		expect(renderMarkdown("- un\n- deux")).toBe(
			"<ul><li>un</li><li>deux</li></ul>"
		);
	});

	it("rend un paragraphe multi-lignes avec <br>", () => {
		expect(renderMarkdown("a\nb")).toBe("<p>a<br>b</p>");
	});

	it("échappe le HTML (anti-XSS)", () => {
		expect(renderMarkdown("<script>alert(1)</script>")).toBe(
			"<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
		);
	});

	it("autorise les liens http(s) mais pas les autres protocoles", () => {
		expect(renderMarkdown("[ok](https://x.fr)")).toBe(
			'<p><a href="https://x.fr" target="_blank" rel="noopener noreferrer">ok</a></p>'
		);
		// javascript: n'est jamais transformé en lien.
		expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("<a ");
	});
});
