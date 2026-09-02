/**
 * Évaluateur de formules **générique** : exprime l'interaction entre
 * caractéristiques sous forme déclarative (ex. `initiative = mod(dexterite)`).
 *
 * Une formule référence d'autres propriétés par leur clé, combine des nombres
 * avec `+ - * / %`, des parenthèses, l'unaire `-`, et des **appels de fonctions**
 * (`floor`, `ceil`, `mod`, ...). Les fonctions ne sont **pas** codées en dur : le
 * cœur ne fournit que des helpers mathématiques neutres ; les fonctions propres à
 * un système (ex. `mod` = modificateur D&D, `MULTICLASS_SLOTS`) sont fournies par
 * le module système via le registre passé à l'évaluation.
 *
 * Aucune dépendance, aucun `eval` : tokenizer + descente récursive maison.
 */

/** Fonction nommée utilisable dans une formule. */
export type FormulaFn = (...args: number[]) => number;

/** Registre de fonctions disponibles à l'évaluation. */
export type FormulaFunctions = Record<string, FormulaFn>;

/** Fonctions mathématiques neutres toujours disponibles (aucune règle de jeu). */
export const BUILTIN_FUNCTIONS: FormulaFunctions = {
	floor: Math.floor,
	ceil: Math.ceil,
	round: Math.round,
	abs: Math.abs,
	min: (...a) => Math.min(...a),
	max: (...a) => Math.max(...a),
};

// --- AST ---------------------------------------------------------------------

type Node =
	| { type: "num"; value: number }
	| { type: "ref"; name: string }
	| { type: "call"; name: string; args: Node[] }
	| { type: "unary"; op: "-"; arg: Node }
	| {
			type: "binary";
			op: "+" | "-" | "*" | "/" | "%";
			left: Node;
			right: Node;
	  };

// --- Tokenizer ---------------------------------------------------------------

type Token =
	| { t: "num"; v: number }
	| { t: "id"; v: string }
	| { t: "op"; v: string }
	| { t: "(" }
	| { t: ")" }
	| { t: "," };

function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	while (i < input.length) {
		const c = input[i];
		if (c === " " || c === "\t" || c === "\n") {
			i++;
			continue;
		}
		if (c === "(") {
			tokens.push({ t: "(" });
			i++;
			continue;
		}
		if (c === ")") {
			tokens.push({ t: ")" });
			i++;
			continue;
		}
		if (c === ",") {
			tokens.push({ t: "," });
			i++;
			continue;
		}
		if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%") {
			tokens.push({ t: "op", v: c });
			i++;
			continue;
		}
		if (c >= "0" && c <= "9") {
			let num = "";
			while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++];
			tokens.push({ t: "num", v: Number(num) });
			continue;
		}
		if (/[a-zA-Z_]/.test(c)) {
			let id = "";
			while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]))
				id += input[i++];
			tokens.push({ t: "id", v: id });
			continue;
		}
		throw new Error(`Caractère invalide dans la formule : "${c}"`);
	}
	return tokens;
}

// --- Parser (descente récursive) ---------------------------------------------

class Parser {
	private pos = 0;
	constructor(private readonly tokens: Token[]) {}

	parse(): Node {
		const node = this.expr();
		if (this.pos < this.tokens.length) {
			throw new Error("Formule mal formée (jetons restants).");
		}
		return node;
	}

	private peek(): Token | undefined {
		return this.tokens[this.pos];
	}

	private expr(): Node {
		let left = this.term();
		let tok = this.peek();
		while (tok && tok.t === "op" && (tok.v === "+" || tok.v === "-")) {
			this.pos++;
			const right = this.term();
			left = { type: "binary", op: tok.v, left, right };
			tok = this.peek();
		}
		return left;
	}

	private term(): Node {
		let left = this.factor();
		let tok = this.peek();
		while (
			tok &&
			tok.t === "op" &&
			(tok.v === "*" || tok.v === "/" || tok.v === "%")
		) {
			this.pos++;
			const right = this.factor();
			left = { type: "binary", op: tok.v, left, right };
			tok = this.peek();
		}
		return left;
	}

	private factor(): Node {
		const tok = this.peek();
		if (!tok) throw new Error("Formule incomplète.");
		if (tok.t === "op" && tok.v === "-") {
			this.pos++;
			return { type: "unary", op: "-", arg: this.factor() };
		}
		if (tok.t === "num") {
			this.pos++;
			return { type: "num", value: tok.v };
		}
		if (tok.t === "(") {
			this.pos++;
			const node = this.expr();
			const close = this.peek();
			if (!close || close.t !== ")")
				throw new Error("Parenthèse fermante manquante.");
			this.pos++;
			return node;
		}
		if (tok.t === "id") {
			this.pos++;
			const next = this.peek();
			if (next && next.t === "(") {
				this.pos++;
				const args: Node[] = [];
				if (this.peek()?.t !== ")") {
					args.push(this.expr());
					while (this.peek()?.t === ",") {
						this.pos++;
						args.push(this.expr());
					}
				}
				const close = this.peek();
				if (!close || close.t !== ")")
					throw new Error("Parenthèse fermante manquante.");
				this.pos++;
				return { type: "call", name: tok.v, args };
			}
			return { type: "ref", name: tok.v };
		}
		throw new Error("Expression invalide.");
	}
}

/** Parse une formule en AST (jette si la syntaxe est invalide). */
export function parseFormula(formula: string): Node {
	return new Parser(tokenize(formula)).parse();
}

/** Liste les clés de propriétés référencées par une formule. */
export function formulaDependencies(formula: string): string[] {
	const deps = new Set<string>();
	const walk = (n: Node): void => {
		switch (n.type) {
			case "ref":
				deps.add(n.name);
				break;
			case "call":
				n.args.forEach(walk);
				break;
			case "unary":
				walk(n.arg);
				break;
			case "binary":
				walk(n.left);
				walk(n.right);
				break;
		}
	};
	walk(parseFormula(formula));
	return [...deps];
}

function evalNode(
	node: Node,
	resolve: (name: string) => number,
	functions: FormulaFunctions,
): number {
	switch (node.type) {
		case "num":
			return node.value;
		case "ref":
			return resolve(node.name);
		case "unary":
			return -evalNode(node.arg, resolve, functions);
		case "binary": {
			const l = evalNode(node.left, resolve, functions);
			const r = evalNode(node.right, resolve, functions);
			switch (node.op) {
				case "+":
					return l + r;
				case "-":
					return l - r;
				case "*":
					return l * r;
				case "/":
					return l / r;
				case "%":
					return l % r;
			}
			break;
		}
		case "call": {
			const fn = functions[node.name];
			if (!fn)
				throw new Error(`Fonction inconnue dans la formule : "${node.name}".`);
			return fn(...node.args.map((a) => evalNode(a, resolve, functions)));
		}
	}
	throw new Error("Nœud d'AST invalide.");
}

/**
 * Évalue une formule unique avec une résolution de référence fournie.
 * `resolve(name)` renvoie la valeur d'une propriété référencée.
 */
export function evaluateFormula(
	formula: string,
	resolve: (name: string) => number,
	functions: FormulaFunctions = BUILTIN_FUNCTIONS,
): number {
	return evalNode(parseFormula(formula), resolve, {
		...BUILTIN_FUNCTIONS,
		...functions,
	});
}

/**
 * Évalue un graphe de propriétés : certaines ont des valeurs de base, d'autres
 * une formule dérivée pouvant en référencer d'autres. Résolution paresseuse,
 * mémoïsée, avec détection de cycle. Les références à une propriété sans formule
 * renvoient sa valeur de base (ou 0).
 */
export function evaluateProperties(params: {
	formulas: Record<string, string | undefined | null>;
	base: Record<string, number>;
	functions?: FormulaFunctions;
}): Record<string, number> {
	const { formulas, base } = params;
	const functions = { ...BUILTIN_FUNCTIONS, ...(params.functions ?? {}) };
	const memo: Record<string, number> = {};
	const visiting = new Set<string>();

	const resolve = (name: string): number => {
		if (name in memo) return memo[name];
		const formula = formulas[name];
		if (formula == null || formula === "") {
			return base[name] ?? 0;
		}
		if (visiting.has(name)) {
			throw new Error(
				`Cycle de dépendance détecté sur la propriété "${name}".`,
			);
		}
		visiting.add(name);
		const value = evalNode(parseFormula(formula), resolve, functions);
		visiting.delete(name);
		memo[name] = value;
		return value;
	};

	const result: Record<string, number> = { ...base };
	for (const key of Object.keys(formulas)) {
		result[key] = resolve(key);
	}
	return result;
}
