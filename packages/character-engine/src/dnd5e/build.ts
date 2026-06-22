/**
 * Construction d'une fiche D&D 5e : à partir des choix de build et du contenu du
 * système, projette les valeurs de propriétés et les sélections à persister.
 *
 * Toute la **logique de règles** D&D vit ici (et non dans l'API) : bonus raciaux,
 * prérequis de multiclassage, améliorations/dons (plafond 20), maîtrises,
 * expertise, jets de sauvegarde, PV/dés de vie, capacités. L'API ne fait que
 * récupérer le contenu, appeler cette fonction et persister le résultat ; elle
 * reste agnostique au système de jeu.
 */

import { applyAbilityBonuses, validateAllocation } from "../allocation";
import type { AbilityScoreMethod, HitPointsMethod } from "../types";
import {
	abilityModifier,
	computeHitDice,
	computeHitPoints,
	type HitDieClass,
} from "./rules";

/** Une entrée de contenu (race, classe, sort…) telle que vue par le moteur. */
export type Dnd5eContentItem = {
	id: string;
	name: string;
	data: Record<string, unknown>;
};

/** Résolution du contenu par (collection, slug) — fournie par l'appelant (API). */
export type ContentResolver = (
	collectionKey: string,
	slug: string,
) => Dnd5eContentItem | undefined;

/** Choix de build (résultat du wizard), indépendant de tout détail de stockage. */
export type Dnd5eBuildInput = {
	raceSlug: string;
	classes: { slug: string; level: number; isPrimary?: boolean }[];
	subclasses?: { classSlug: string; slug: string }[];
	backgroundSlug: string;
	abilityMethod: AbilityScoreMethod;
	abilityScores: Record<string, number>;
	hpMethod?: HitPointsMethod;
	hpMax?: number;
	skillProficiencies?: string[];
	expertise?: string[];
	asiAllocations?: Record<string, number>[];
	feats?: string[];
	spells?: { slug: string; classSlug: string; role: string }[];
	inventory?: { slug: string; qty: number }[];
	gold?: number;
	lore?: Record<string, string>;
	/** Config de l'étape de répartition (validation des caractéristiques). */
	allocation?: {
		pool?: number;
		costTable?: Record<number, number>;
		min?: number;
		max?: number;
		standardArray?: number[];
	};
};

/** Une sélection à persister (sans id/fiche, ajoutés par l'API). */
export type Dnd5eBuiltSelection = {
	collectionKey: string;
	contentId: string;
	level?: number;
	isPrimary?: boolean;
	qty?: number;
	extra?: Record<string, unknown>;
};

/** Résultat de la construction : valeurs projetées + sélections, ou erreur. */
export type Dnd5eBuildResult = {
	error?: string;
	values: Record<string, unknown>;
	selections: Dnd5eBuiltSelection[];
};

/** Score maximum atteignable par amélioration (D&D 5e). */
const ABILITY_SCORE_CAP = 20;

/**
 * Construit la projection d'une fiche D&D 5e. Renvoie `{ error }` en cas de
 * référence invalide, répartition invalide ou prérequis de multiclassage non
 * respecté ; sinon `{ values, selections }`.
 */
export function buildCharacter(
	input: Dnd5eBuildInput,
	getContent: ContentResolver,
): Dnd5eBuildResult {
	const empty = { values: {}, selections: [] };

	const race = getContent("race", input.raceSlug);
	const background = getContent("background", input.backgroundSlug);
	const classRefs = input.classes.map((c) => ({
		input: c,
		content: getContent("classe", c.slug),
	}));
	if (!race || !background || classRefs.some((c) => !c.content)) {
		return {
			...empty,
			error: "Référence de contenu invalide (race, classe ou background)",
		};
	}

	// Validation de la répartition des caractéristiques.
	if (input.allocation) {
		const a = input.allocation;
		const result = validateAllocation(
			input.abilityMethod,
			input.abilityScores,
			{
				pointBuy: a.costTable
					? {
							pool: a.pool ?? 0,
							costTable: a.costTable,
							min: a.min ?? 0,
							max: a.max ?? 99,
						}
					: undefined,
				standardArray: a.standardArray,
			},
		);
		if (!result.valid) {
			return {
				...empty,
				error: `Répartition invalide : ${result.errors.join(" ; ")}`,
			};
		}
	}

	const raceData = race.data as {
		abilityBonuses?: Record<string, number>;
		skillProficiencies?: string[];
		speed?: number;
		languages?: string[];
		traits?: { name?: string }[];
	};

	// Scores finaux = base + bonus raciaux.
	const finalScores = applyAbilityBonuses(
		input.abilityScores,
		raceData.abilityBonuses ?? {},
	);

	// Prérequis de multiclassage (sur base + bonus raciaux).
	if (input.classes.length > 1) {
		for (const ref of classRefs) {
			const prereq =
				(ref.content?.data as { multiclassPrereq?: Record<string, number> })
					?.multiclassPrereq ?? {};
			const ok = Object.entries(prereq).every(
				([key, min]) => (finalScores[key] ?? 0) >= Number(min),
			);
			if (!ok) {
				return {
					...empty,
					error: `Prérequis de multiclassage non respectés pour ${ref.content?.name}`,
				};
			}
		}
	}

	const totalLevel = input.classes.reduce((sum, c) => sum + c.level, 0);

	// Améliorations (ASI) + bonus de demi-dons, plafonnés à 20.
	const improvementBonuses: Record<string, number> = {};
	const addBonus = (key: string, v: number) => {
		improvementBonuses[key] = (improvementBonuses[key] ?? 0) + v;
	};
	for (const alloc of input.asiAllocations ?? []) {
		for (const [key, v] of Object.entries(alloc)) addBonus(key, Number(v));
	}
	for (const slug of input.feats ?? []) {
		const ab = (
			getContent("don", slug)?.data as {
				abilityBonuses?: Record<string, number>;
			}
		)?.abilityBonuses;
		for (const [key, v] of Object.entries(ab ?? {})) addBonus(key, Number(v));
	}
	const improvedScores: Record<string, number> = { ...finalScores };
	for (const [key, v] of Object.entries(improvementBonuses)) {
		improvedScores[key] = Math.min(
			ABILITY_SCORE_CAP,
			(Number(improvedScores[key]) || 0) + v,
		);
	}

	// Maîtrises de compétences : race + historique + sous-classe + choix joueur ;
	// l'expertise implique la maîtrise.
	const subclassSkills = (input.subclasses ?? []).flatMap(
		(sc) =>
			((
				getContent("sous-classe", sc.slug)?.data as {
					skillProficiencies?: string[];
				}
			)?.skillProficiencies ?? []) as string[],
	);
	const bgData = background.data as {
		skillProficiencies?: string[];
		toolProficiencies?: string[];
		feature?: { name?: string };
	};
	const skills = new Set<string>([
		...(raceData.skillProficiencies ?? []),
		...(bgData.skillProficiencies ?? []),
		...subclassSkills,
		...(input.skillProficiencies ?? []),
		...(input.expertise ?? []),
	]);

	// — Projection des valeurs —
	const values: Record<string, unknown> = {};
	for (const [key, score] of Object.entries(improvedScores)) {
		values[key] = score;
	}
	for (const skill of skills) values[skill] = true;
	if (input.expertise?.length) values.expertises = input.expertise;
	if (input.asiAllocations?.length) values.ameliorations = input.asiAllocations;
	values.niveau = totalLevel;
	if (raceData.speed != null) values.vitesse = raceData.speed;

	// PV & dés de vie.
	const hitDieClasses: HitDieClass[] = classRefs.map((ref) => ({
		hitDie: Number((ref.content?.data as { hitDie?: number })?.hitDie) || 8,
		level: ref.input.level,
		isPrimary: ref.input.isPrimary ?? false,
	}));
	const conMod = abilityModifier(Number(improvedScores.constitution) || 10);
	const maxHp =
		input.hpMax ??
		computeHitPoints({
			classes: hitDieClasses,
			conMod,
			method: input.hpMethod ?? "average",
		}).maxHp;
	values.hp = { current: maxHp, max: maxHp };
	values.des_de_vie = computeHitDice(hitDieClasses);

	for (const [key, text] of Object.entries(input.lore ?? {})) {
		values[key] = text;
	}

	// Jets de sauvegarde : maîtrises de la classe principale + maîtrises
	// accordées par les dons (ex. Vif) et les sous-classes.
	const primaryRef = classRefs.find((r) => r.input.isPrimary) ?? classRefs[0];
	const primaryData = (primaryRef?.content?.data ?? {}) as {
		savingThrows?: string[];
		toolProficiencies?: string[];
	};
	const saves = new Set<string>(primaryData.savingThrows ?? []);
	for (const slug of input.feats ?? []) {
		const featSaves = (
			getContent("don", slug)?.data as {
				savingThrows?: string[];
			}
		)?.savingThrows;
		for (const ab of featSaves ?? []) saves.add(ab);
	}
	for (const sc of input.subclasses ?? []) {
		const subSaves = (
			getContent("sous-classe", sc.slug)?.data as {
				savingThrows?: string[];
			}
		)?.savingThrows;
		for (const ab of subSaves ?? []) saves.add(ab);
	}
	for (const ab of saves) values[`sauvegarde_${ab}`] = true;

	// Or de départ → pièces d'or.
	if (input.gold != null) values.pieces_or = input.gold;

	// Autres maîtrises & langues.
	const langs = raceData.languages ?? [];
	const tools = [
		...(primaryData.toolProficiencies ?? []),
		...(bgData.toolProficiencies ?? []),
	];
	const profLines: string[] = [];
	if (langs.length) profLines.push(`Langues : ${langs.join(", ")}`);
	if (tools.length) profLines.push(`Outils : ${tools.join(", ")}`);
	if (profLines.length) values.maitrises_langues = profLines.join("\n");

	// Capacités & traits : traits raciaux + aptitude d'historique + aptitudes de
	// sous-classe obtenues au niveau actuel + dons choisis.
	const capacites = [
		...(raceData.traits ?? []).map((t) => t.name).filter(Boolean),
		...(bgData.feature?.name ? [bgData.feature.name] : []),
	];
	for (const sc of input.subclasses ?? []) {
		const item = getContent("sous-classe", sc.slug);
		if (!item) continue;
		const lvl = input.classes.find((c) => c.slug === sc.classSlug)?.level ?? 0;
		const features =
			(item.data as { features?: { level: number; name: string }[] })
				.features ?? [];
		for (const f of features) {
			if (f.level <= lvl) capacites.push(`${item.name} : ${f.name}`);
		}
	}
	for (const slug of input.feats ?? []) {
		const item = getContent("don", slug);
		if (item) capacites.push(`Don : ${item.name}`);
	}
	if (capacites.length) values.capacites_traits = capacites.join(", ");

	// — Sélections à persister —
	const selections: Dnd5eBuiltSelection[] = [
		{ collectionKey: "race", contentId: race.id },
		{ collectionKey: "background", contentId: background.id },
		...classRefs.map((ref) => ({
			collectionKey: "classe",
			// biome-ignore lint/style/noNonNullAssertion: présence garantie ci-dessus.
			contentId: ref.content!.id,
			level: ref.input.level,
			isPrimary: ref.input.isPrimary ?? false,
		})),
	];
	for (const s of input.spells ?? []) {
		const sp = getContent("sort", s.slug);
		if (sp) {
			selections.push({
				collectionKey: "sort",
				contentId: sp.id,
				extra: { classSlug: s.classSlug, role: s.role },
			});
		}
	}
	for (const sc of input.subclasses ?? []) {
		const item = getContent("sous-classe", sc.slug);
		if (item) {
			selections.push({
				collectionKey: "sous-classe",
				contentId: item.id,
				extra: { classSlug: sc.classSlug },
			});
		}
	}
	for (const item of input.inventory ?? []) {
		const eq = getContent("equipement", item.slug);
		if (eq) {
			selections.push({
				collectionKey: "equipement",
				contentId: eq.id,
				qty: item.qty,
			});
		}
	}
	for (const slug of input.feats ?? []) {
		const item = getContent("don", slug);
		if (item) selections.push({ collectionKey: "don", contentId: item.id });
	}

	return { values, selections };
}
