/**
 * Rendu Markdown minimal et **sûr** (sous-ensemble) pour les notes.
 *
 * Le texte est d'abord échappé (anti-XSS) puis seul un sous-ensemble de balises
 * est réintroduit : titres, gras, italique, code, listes, liens http(s). Les
 * URLs non http(s) (ex. `javascript:`) ne sont jamais transformées en liens.
 */

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Transforme les marques inline sur un texte déjà échappé. */
function renderInline(text: string): string {
	return text
		.replace(
			/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
		)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*([^*]+)\*/g, "<em>$1</em>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Convertit du Markdown (sous-ensemble) en HTML sûr. */
export function renderMarkdown(md: string): string {
	if (!md) return "";
	const lines = escapeHtml(md).split(/\r?\n/);
	const html: string[] = [];
	let list: string[] = [];
	let para: string[] = [];

	const flushList = () => {
		if (list.length) {
			html.push(
				`<ul>${list.map((li) => `<li>${renderInline(li)}</li>`).join("")}</ul>`
			);
			list = [];
		}
	};
	const flushPara = () => {
		if (para.length) {
			html.push(`<p>${para.map(renderInline).join("<br>")}</p>`);
			para = [];
		}
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		const heading = /^(#{1,3})\s+(.*)$/.exec(line);
		const item = /^[-*]\s+(.*)$/.exec(line);
		if (heading) {
			flushList();
			flushPara();
			const level = heading[1].length;
			html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
		} else if (item) {
			flushPara();
			list.push(item[1]);
		} else if (line.trim() === "") {
			flushList();
			flushPara();
		} else {
			flushList();
			para.push(line);
		}
	}
	flushList();
	flushPara();
	return html.join("");
}
