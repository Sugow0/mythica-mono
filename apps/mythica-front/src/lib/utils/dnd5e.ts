/** Helpers de la fiche D&D 5e — logique pure, testable hors composant. */

export type Ability = { key: string; label: string; abbr: string };

/** Les 6 caractéristiques de base de D&D 5e, dans l'ordre canonique. */
export const DND5E_ABILITIES: Ability[] = [
	{ key: "force", label: "Force", abbr: "FOR" },
	{ key: "dexterite", label: "Dextérité", abbr: "DEX" },
	{ key: "constitution", label: "Constitution", abbr: "CON" },
	{ key: "intelligence", label: "Intelligence", abbr: "INT" },
	{ key: "sagesse", label: "Sagesse", abbr: "SAG" },
	{ key: "charisme", label: "Charisme", abbr: "CHA" },
];

/** Valeur de caractéristique par défaut (D&D 5e). */
export const DEFAULT_ABILITY_SCORE = 10;

/** Modificateur D&D 5e d'une caractéristique : floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

/** Formate un modificateur avec son signe explicite (+2, -1, +0). */
export function formatModifier(modifier: number): string {
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export type Skill = { key: string; label: string; ability: string };

/** Les 18 compétences de D&D 5e, chacune rattachée à une caractéristique. */
export const DND5E_SKILLS: Skill[] = [
	{ key: "acrobaties", label: "Acrobaties", ability: "dexterite" },
	{ key: "arcanes", label: "Arcanes", ability: "intelligence" },
	{ key: "athletisme", label: "Athlétisme", ability: "force" },
	{ key: "discretion", label: "Discrétion", ability: "dexterite" },
	{ key: "dressage", label: "Dressage", ability: "sagesse" },
	{ key: "escamotage", label: "Escamotage", ability: "dexterite" },
	{ key: "histoire", label: "Histoire", ability: "intelligence" },
	{ key: "intimidation", label: "Intimidation", ability: "charisme" },
	{ key: "intuition", label: "Intuition", ability: "sagesse" },
	{ key: "investigation", label: "Investigation", ability: "intelligence" },
	{ key: "medecine", label: "Médecine", ability: "sagesse" },
	{ key: "nature", label: "Nature", ability: "intelligence" },
	{ key: "perception", label: "Perception", ability: "sagesse" },
	{ key: "persuasion", label: "Persuasion", ability: "charisme" },
	{ key: "religion", label: "Religion", ability: "intelligence" },
	{ key: "representation", label: "Représentation", ability: "charisme" },
	{ key: "survie", label: "Survie", ability: "sagesse" },
	{ key: "tromperie", label: "Tromperie", ability: "charisme" },
];

/** Bonus de maîtrise par défaut (niveau 1-4). */
export const DEFAULT_PROFICIENCY_BONUS = 2;

/** Bonus de maîtrise D&D 5e en fonction du niveau (1→+2, 5→+3, …, 17-20→+6). */
export function proficiencyBonusForLevel(level: number): number {
	const clamped = Math.min(20, Math.max(1, Math.floor(level)));
	return 2 + Math.floor((clamped - 1) / 4);
}

/**
 * Bonus total d'une compétence ou d'un jet de sauvegarde :
 * modificateur de caractéristique + bonus de maîtrise si maîtrisé.
 */
export function skillBonus(
	abilityScore: number,
	proficient: boolean,
	proficiencyBonus = DEFAULT_PROFICIENCY_BONUS
): number {
	return abilityModifier(abilityScore) + (proficient ? proficiencyBonus : 0);
}

/** Résultat d'un jet de d20 (+ modificateur). */
export type D20Roll = { roll: number; modifier: number; total: number };

/** Lance 1d20 + modificateur. `rng` injectable pour des tests déterministes. */
export function rollD20(
	modifier: number,
	rng: () => number = Math.random
): D20Roll {
	const roll = Math.floor(rng() * 20) + 1;
	return { roll, modifier, total: roll + modifier };
}

export type CharacterState = { key: string; label: string };

/** États possibles d'un personnage (D&D 5e simplifié). */
export const DND5E_CHARACTER_STATES: CharacterState[] = [
	{ key: "normal", label: "Normal" },
	{ key: "stabilise", label: "Stabilisé" },
	{ key: "mort", label: "Mort" },
];

export type HpState = { current: number; temp: number; max: number };

/**
 * Applique une variation de PV. Les dégâts (delta < 0) entament d'abord les PV
 * temporaires puis les PV courants (plancher 0) ; les soins (delta > 0)
 * augmentent les PV courants sans dépasser le maximum (les PV temp ne sont pas
 * soignés). Retourne les nouveaux { current, temp }.
 */
export function adjustHp(
	state: HpState,
	delta: number
): { current: number; temp: number } {
	if (delta >= 0) {
		return {
			current: Math.min(state.max, state.current + delta),
			temp: state.temp,
		};
	}
	let damage = -delta;
	let temp = state.temp;
	if (temp > 0) {
		const absorbed = Math.min(temp, damage);
		temp -= absorbed;
		damage -= absorbed;
	}
	return { current: Math.max(0, state.current - damage), temp };
}

export type InventoryItem = {
	id: string;
	name: string;
	quantity: number;
	weight: number;
	equipped: boolean;
};

/** Charge totale portée : somme des (quantité × poids unitaire). */
export function totalWeight(
	items: { quantity: number; weight: number }[]
): number {
	return items.reduce(
		(sum, item) => sum + (item.quantity || 0) * (item.weight || 0),
		0
	);
}

/** DD d'un sort : 8 + bonus de maîtrise + modificateur de caractéristique. */
export function spellSaveDc(
	abilityMod: number,
	proficiencyBonus: number
): number {
	return 8 + proficiencyBonus + abilityMod;
}

/** Bonus d'attaque de sort : bonus de maîtrise + modificateur de caractéristique. */
export function spellAttackBonus(
	abilityMod: number,
	proficiencyBonus: number
): number {
	return proficiencyBonus + abilityMod;
}

export type WeaponDamage = { dice: string; type: string };

/**
 * Décompose une chaîne de dégâts d'arme (« 1d8 perforant ») en dé + type.
 * Tolérant : renvoie des chaînes vides si le format est inattendu.
 */
export function parseWeaponDamage(degats: string | undefined): WeaponDamage {
	if (!degats) return { dice: "", type: "" };
	const match = degats.match(/(\d+\s*d\s*\d+)/i);
	const dice = match ? match[1].replace(/\s+/g, "") : "";
	const type = (match ? degats.replace(match[1], "") : degats).trim();
	return { dice, type };
}

/**
 * Caractéristique d'attaque d'une arme selon ses propriétés :
 * finesse → meilleur entre Force et Dextérité ; arme à distance → Dextérité ;
 * sinon Force.
 */
export function weaponAbilityKey(
	properties: string | undefined,
	scores: { force?: number; dexterite?: number }
): "force" | "dexterite" {
	const p = (properties ?? "").toLowerCase();
	const isRanged = /distance|munitions/.test(p);
	const isFinesse = /finesse/.test(p);
	if (isRanged) return "dexterite";
	if (isFinesse) {
		const str = abilityModifier(scores.force ?? DEFAULT_ABILITY_SCORE);
		const dex = abilityModifier(scores.dexterite ?? DEFAULT_ABILITY_SCORE);
		return dex > str ? "dexterite" : "force";
	}
	return "force";
}

export type HitDieEntry = { size: number; current: number; max: number };

/**
 * Normalise une valeur de dés de vie en entrées par taille de dé. Tolère le
 * nouveau format (map `{ "6": {current,max} }`) et l'ancien resource unique
 * (`{ current, max }`, taille inconnue → 0).
 */
export function hitDiceEntries(value: unknown): HitDieEntry[] {
	if (!value || typeof value !== "object") return [];
	const obj = value as Record<string, unknown>;
	// Ancien format resource : { current, max } scalaires.
	if (typeof obj.current === "number" || typeof obj.max === "number") {
		return [
			{ size: 0, current: Number(obj.current) || 0, max: Number(obj.max) || 0 },
		];
	}
	// Nouveau format : map taille → { current, max }.
	return Object.entries(obj)
		.map(([size, v]) => {
			const r = (v ?? {}) as { current?: unknown; max?: unknown };
			return {
				size: Number(size) || 0,
				current: Number(r.current) || 0,
				max: Number(r.max) || 0,
			};
		})
		.filter((e) => e.max > 0 || e.current > 0)
		.sort((a, b) => a.size - b.size);
}

/** Libellé d'un niveau de sort (0 = tours de magie). */
export function spellLevelLabel(level: number): string {
	return level === 0 ? "Tours de magie" : `Niveau ${level}`;
}

/** Niveaux de sorts D&D 5e (0 = tours de magie, 1 à 9). */
export const SPELL_LEVELS: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export type Spell = {
	id: string;
	name: string;
	level: number;
	range?: string;
	duration?: string;
	description?: string;
};

export type SpellGroup = { level: number; label: string; spells: Spell[] };

/**
 * Regroupe les sorts par niveau (ordre croissant). Ne retourne que les niveaux
 * comportant au moins un sort.
 */
export function groupSpellsByLevel(spells: Spell[]): SpellGroup[] {
	const byLevel = new Map<number, Spell[]>();
	for (const spell of spells) {
		const list = byLevel.get(spell.level);
		if (list) list.push(spell);
		else byLevel.set(spell.level, [spell]);
	}
	return [...byLevel.keys()]
		.sort((a, b) => a - b)
		.map((level) => ({
			level,
			label: spellLevelLabel(level),
			spells: byLevel.get(level) ?? [],
		}));
}
