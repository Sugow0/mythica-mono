/**
 * Catalogue des propriétés de fiche L'Appel de Cthulhu 7e édition seedées dans
 * `character_sheet_properties`.
 *
 * Ce catalogue est **indépendant d'un système** : il décrit les propriétés
 * réutilisables d'une fiche d'investigateur. Le mapping système ↔ propriété
 * (`game_system_properties`) est traité dans `coc-system-properties.ts`.
 *
 * Contrainte CLÉ : `character_sheet_properties.key` est unique **au niveau
 * global**, toutes éditions et systèmes confondus. Pour éviter toute collision
 * avec les keys non préfixées de D&D (`force`, `hp`, `perception`…), **toutes**
 * les keys CoC sont préfixées `coc_`. La key reste limitée à VarChar(100).
 *
 * La `key` (unique) est la clé naturelle : le seed est idempotent par `key` et
 * l'`id` (UUID v7) est généré à la création, jamais codé en dur.
 *
 * Les caractéristiques et compétences de CoC 7e sont exprimées en pourcentage
 * (type `number`) ; les `defaultValue` des compétences reprennent la valeur de
 * base standard de la 7e édition, exprimées en chaîne (ex `"05"`, `"20"`).
 */
import type { CharacterSheetPropertyData } from "./dnd5e-properties";

/**
 * Les 8 caractéristiques (exprimées en %, type number). La valeur par défaut de
 * `"50"` est une base raisonnable et neutre pour un investigateur.
 */
const CARACTERISTIQUES: CharacterSheetPropertyData[] = [
	{
		key: "coc_for",
		label: "Force (FOR)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique de Force, en pourcentage.",
	},
	{
		key: "coc_con",
		label: "Constitution (CON)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique de Constitution, en pourcentage.",
	},
	{
		key: "coc_tai",
		label: "Taille (TAI)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique de Taille, en pourcentage.",
	},
	{
		key: "coc_dex",
		label: "Dextérité (DEX)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique de Dextérité, en pourcentage.",
	},
	{
		key: "coc_app",
		label: "Apparence (APP)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique d'Apparence, en pourcentage.",
	},
	{
		key: "coc_int",
		label: "Intelligence (INT)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique d'Intelligence, en pourcentage.",
	},
	{
		key: "coc_pou",
		label: "Pouvoir (POU)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique de Pouvoir, en pourcentage.",
	},
	{
		key: "coc_edu",
		label: "Éducation (EDU)",
		type: "number",
		defaultValue: "50",
		description: "Caractéristique d'Éducation, en pourcentage.",
	},
];

/** Ressources consommables / régénérables (santé mentale, PV, points de magie). */
const RESSOURCES: CharacterSheetPropertyData[] = [
	{
		key: "coc_sante_mentale",
		label: "Santé mentale",
		type: "resource",
		description: "Santé mentale (courante / maximum) de l'investigateur.",
	},
	{
		key: "coc_hp",
		label: "Points de vie",
		type: "resource",
		description: "Points de vie (courants / maximum) de l'investigateur.",
	},
	{
		key: "coc_pdm",
		label: "Points de magie",
		type: "resource",
		description: "Points de magie (courants / maximum) de l'investigateur.",
	},
];

/** Équipement et richesse : armes (liste) et niveau de crédit (%). */
const EQUIPEMENT: CharacterSheetPropertyData[] = [
	{
		key: "coc_armes",
		label: "Armes",
		type: "list",
		description: "Liste des armes de l'investigateur.",
	},
	{
		key: "coc_credit",
		label: "Niveau de crédit",
		type: "number",
		defaultValue: "0",
		description:
			"Niveau de crédit (richesse) de l'investigateur, en pourcentage.",
	},
];

/**
 * Définition d'une compétence : libellé affiché, slug ASCII (sans accents) et
 * valeur de base standard de CoC 7e en pourcentage (chaîne).
 */
type SkillDef = { slug: string; label: string; base: string };

/**
 * Liste standard des compétences d'investigateur de CoC 7e, avec leur valeur de
 * base en %. Les keys finales sont préfixées `coc_` + slug ASCII.
 */
const SKILL_DEFS: SkillDef[] = [
	{ slug: "comptabilite", label: "Comptabilité", base: "05" },
	{ slug: "anthropologie", label: "Anthropologie", base: "01" },
	{ slug: "estimation", label: "Estimation", base: "05" },
	{ slug: "archeologie", label: "Archéologie", base: "01" },
	{ slug: "arts_et_metiers", label: "Arts et métiers", base: "05" },
	{ slug: "charme", label: "Charme", base: "15" },
	{ slug: "grimper", label: "Grimper", base: "20" },
	{ slug: "mythe_de_cthulhu", label: "Mythe de Cthulhu", base: "00" },
	{ slug: "baratin", label: "Baratin", base: "05" },
	{ slug: "combat_rapproche", label: "Combat rapproché (Bagarre)", base: "25" },
	{ slug: "armes_a_feu_poing", label: "Armes à feu (poing)", base: "20" },
	{
		slug: "armes_a_feu_fusil",
		label: "Armes à feu (fusil/carabine)",
		base: "25",
	},
	{ slug: "premiers_soins", label: "Premiers soins", base: "30" },
	{ slug: "histoire", label: "Histoire", base: "05" },
	{ slug: "intimidation", label: "Intimidation", base: "15" },
	{ slug: "sauter", label: "Sauter", base: "20" },
	{ slug: "langue_etrangere", label: "Langue étrangère", base: "01" },
	{ slug: "langue_maternelle", label: "Langue maternelle", base: "50" },
	{ slug: "droit", label: "Droit", base: "05" },
	{ slug: "bibliotheque", label: "Bibliothèque", base: "20" },
	{ slug: "ecouter", label: "Écouter", base: "20" },
	{ slug: "crochetage", label: "Crochetage", base: "01" },
	{ slug: "mecanique", label: "Réparation (mécanique)", base: "10" },
	{ slug: "medecine", label: "Médecine", base: "01" },
	{ slug: "sciences_occultes", label: "Sciences occultes", base: "05" },
	{ slug: "conduite_engins", label: "Conduite d'engins", base: "01" },
	{ slug: "electricite", label: "Réparation (électricité)", base: "10" },
	{ slug: "conduite_auto", label: "Conduite auto", base: "20" },
	{ slug: "sciences_naturelles", label: "Sciences naturelles", base: "10" },
	{ slug: "navigation", label: "Navigation", base: "10" },
	{ slug: "psychanalyse", label: "Psychanalyse", base: "01" },
	{ slug: "psychologie", label: "Psychologie", base: "10" },
	{ slug: "equitation", label: "Équitation", base: "05" },
	{ slug: "escamotage", label: "Escamotage", base: "10" },
	{ slug: "discretion", label: "Discrétion", base: "20" },
	{ slug: "pister", label: "Pister", base: "10" },
	{ slug: "lancer", label: "Lancer", base: "20" },
	{ slug: "natation", label: "Natation", base: "20" },
	{ slug: "persuasion", label: "Persuasion", base: "10" },
	{
		slug: "trouver_objet_cache",
		label: "Trouver objet caché (Repérage)",
		base: "25",
	},
	{ slug: "esquive", label: "Esquive", base: "00" },
	{ slug: "survie", label: "Survie", base: "10" },
	{ slug: "deguisement", label: "Déguisement", base: "05" },
	{ slug: "plongee", label: "Plongée sous-marine", base: "01" },
	{ slug: "hypnose", label: "Hypnose", base: "01" },
	{ slug: "dressage", label: "Dressage", base: "05" },
	{ slug: "pilotage", label: "Pilotage", base: "01" },
	{ slug: "arme_lourde", label: "Arme lourde", base: "10" },
	{ slug: "lance_flammes", label: "Lance-flammes", base: "10" },
	{ slug: "mitrailleuse", label: "Mitrailleuse", base: "10" },
	{ slug: "fusil_mitrailleur", label: "Fusil mitrailleur", base: "15" },
	{ slug: "arc", label: "Arc", base: "15" },
	{ slug: "operer_machine", label: "Opérer une machine lourde", base: "01" },
	{ slug: "art_litterature", label: "Art/Artisanat (littérature)", base: "05" },
	{ slug: "sciences", label: "Sciences (générique)", base: "01" },
	{ slug: "sciences_chimie", label: "Sciences (chimie)", base: "01" },
];

/** Les 50+ compétences investigateur (number, % ; defaultValue = base standard). */
const COMPETENCES: CharacterSheetPropertyData[] = SKILL_DEFS.map((skill) => ({
	key: `coc_${skill.slug}`,
	label: skill.label,
	type: "number" as const,
	defaultValue: skill.base,
	description: `Compétence ${skill.label}, en pourcentage (base ${skill.base}%).`,
}));

/**
 * Catalogue complet des propriétés de fiche CoC 7e, données pures et stables.
 * L'idempotence du seed repose sur la `key` (unique, préfixée `coc_`) ; aucun
 * `id` n'est codé en dur — il est généré en UUID v7 à l'insertion.
 */
export const COC_CHARACTER_SHEET_PROPERTIES: CharacterSheetPropertyData[] = [
	...CARACTERISTIQUES,
	...RESSOURCES,
	...EQUIPEMENT,
	...COMPETENCES,
];
