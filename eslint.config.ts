import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import prettier from "eslint-config-prettier";
import globals from "globals";
import type { Linter } from "eslint";

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...(svelte.configs["flat/recommended"] as Linter.Config[]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		rules: {
			// _ est une convention pour les variables intentionnellement inutilisées
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: ts.parser,
			},
		},
		rules: {
			// localizeHref (paraglide) gère déjà la résolution des URLs
			"svelte/no-navigation-without-resolve": "off",
			// bind:this={ref} est utilisé par le framework, pas forcément dans le code TS
			"no-useless-assignment": "off",
		},
	},
	prettier,
	{
		ignores: [
			".svelte-kit/",
			"build/",
			"src/lib/api/generated/",
			"src/lib/paraglide/",
		],
	},
] satisfies Linter.Config[];
