/**
 * Types du module de contenu D&D 5e (2014).
 *
 * Chaque entrée devient une ligne `SystemContent` : le `slug` (unique par
 * système+collection) est la clé naturelle, l'`id` (UUID v7) est généré au seed.
 * Le champ `data` porte les attributs propres à la collection ; il sera validé à
 * l'écriture par un schéma TypeBox (FEAT-190, phase 2c).
 *
 * Volume : sous-ensemble curé pour faire tourner la verticale ; le contenu PHB
 * complet sera ingéré ensuite (PDF FR/EN) sans changer l'architecture.
 */

/** Clés de collection utilisées par D&D 5e. */
export type Dnd5eCollectionKey =
	| "race"
	| "classe"
	| "sous-classe"
	| "background"
	| "sort"
	| "equipement";

/** Une entrée de contenu générique, prête à seeder. */
export type SystemContentSeed = {
	collectionKey: Dnd5eCollectionKey;
	slug: string;
	name: string;
	description?: string;
	sortOrder?: number;
	data: Record<string, unknown>;
};

/** Bonus de caractéristiques (clés alignées sur les propriétés de fiche). */
export type AbilityBonusMap = Partial<
	Record<
		| "force"
		| "dexterite"
		| "constitution"
		| "intelligence"
		| "sagesse"
		| "charisme",
		number
	>
>;

/** Trait nommé (raciaux, de classe, de background). */
export type NamedTrait = { name: string; description: string };

/** `data` d'une race. */
export type RaceData = {
	size: "P" | "M" | "G";
	/** Vitesse de base en mètres (cohérent avec la propriété `vitesse`). */
	speed: number;
	abilityBonuses: AbilityBonusMap;
	languages: string[];
	/** Maîtrises de compétences accordées (clés de propriété de compétence). */
	skillProficiencies?: string[];
	traits: NamedTrait[];
};

/** Catégorie de lanceur (aligné sur character-engine), pour les emplacements. */
export type CasterType = "none" | "full" | "half" | "third" | "warlock";

/** Mécanique de sélection des sorts (séparée des emplacements). */
export type SpellcastingKind =
	| "prepared"
	| "prepared_half"
	| "known"
	| "known_half"
	| "wizard"
	| "pact";

/** Métadonnée de sélection de sorts d'une classe lanceuse. */
export type SpellcastingData = {
	kind: SpellcastingKind | "third_known";
	/** Caractéristique d'incantation (clé de propriété). */
	ability: string;
	/** Tours de magie connus par niveau (1→20), si la classe en a. */
	cantripsKnown?: number[];
	/** Sorts connus par niveau (1→20), pour les connaissants. */
	spellsKnown?: number[];
	/** Liste de sorts puisée (slug de classe), si différente — ex. tiers-lanceur. */
	spellListClass?: string;
	/** Restriction d'écoles (tiers-lanceur), ex. ["Abjuration", "Évocation"]. */
	schoolFilter?: string[];
};

/** Un objet d'équipement avec sa quantité. */
export type EquipmentEntry = { slug: string; qty: number };

/** Une option d'un groupe de choix d'équipement (ex. « cuir + arc long »). */
export type EquipmentOption = { label: string; items: EquipmentEntry[] };

/**
 * Un groupe de choix d'équipement de départ. Une seule option par groupe ;
 * un groupe à une option unique est un octroi fixe.
 */
export type EquipmentChoiceGroup = { options: EquipmentOption[] };

/** Dés de richesse de départ (un unique lancer), ex. 5d4 × 10 po. */
export type StartingGoldRoll = { dice: number; sides: number; mult: number };

/** `data` d'une classe. */
export type ClassData = {
	hitDie: number;
	primaryAbility: string[];
	savingThrows: string[];
	armorProficiencies: string[];
	weaponProficiencies: string[];
	toolProficiencies: string[];
	/** Choix de compétences de classe à la création. */
	skillChoices: { count: number; from: string[] };
	casterType: CasterType;
	spellcastingAbility?: string;
	/** Sélection de sorts (cantrips/connus/préparés) ; absent si non-lanceur. */
	spellcasting?: SpellcastingData;
	/** Prérequis de caractéristiques pour multiclasser vers/depuis cette classe. */
	multiclassPrereq?: AbilityBonusMap;
	/** Équipement de départ simple (déprécié au profit de `startingEquipmentOptions`). */
	startingEquipment: string[];
	/** Groupes de choix d'équipement de départ (aidedd) de la classe. */
	startingEquipmentOptions?: EquipmentChoiceGroup[];
	/** Dés de richesse de départ de la classe (alternative/bourse). */
	startingGoldRoll?: StartingGoldRoll;
};

/** `data` d'un background. */
export type BackgroundData = {
	skillProficiencies: string[];
	toolProficiencies: string[];
	/** Nombre de langues supplémentaires au choix. */
	languages: number;
	feature: NamedTrait;
	startingGold: number;
	startingEquipment: string[];
};

/** Une aptitude de sous-classe, obtenue à un niveau donné. */
export type SubclassFeature = {
	level: number;
	name: string;
	description: string;
};

/** `data` d'une sous-classe (collection "sous-classe"). */
export type SubclassData = {
	/** Slug de la classe parente. */
	parentClass: string;
	/** Niveau de classe auquel la sous-classe est choisie. */
	acquisitionLevel: number;
	/** Aptitudes de la sous-classe, par niveau. */
	features: SubclassFeature[];
	/** Sorts toujours préparés (domaines, serments...) : slugs. */
	alwaysPrepared?: string[];
	/** Lanceur conféré par la sous-classe (tiers-lanceur : chevalier occulte...). */
	spellcasting?: SpellcastingData;
};

/** `data` d'un sort. */
export type SpellData = {
	level: number;
	school: string;
	castingTime: string;
	range: string;
	components: string;
	duration: string;
	/** Slugs des classes pouvant apprendre ce sort. */
	classes: string[];
};

/** `data` d'un objet d'équipement. */
export type EquipmentData = {
	category: "arme" | "armure" | "bouclier" | "objet";
	costGp: number;
	weight: number;
	properties?: Record<string, unknown>;
};
