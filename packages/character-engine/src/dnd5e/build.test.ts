import { describe, expect, test } from "bun:test";
import { buildCharacter, type Dnd5eContentItem } from "./build";

const CONTENT: Record<string, Dnd5eContentItem> = {
	"race:haut-elfe": {
		id: "r1",
		name: "Haut-elfe",
		data: {
			abilityBonuses: { dexterite: 2, intelligence: 1 },
			speed: 9,
			skillProficiencies: ["perception"],
			languages: ["commun", "elfique"],
			traits: [{ name: "Vision dans le noir" }],
		},
	},
	"classe:magicien": {
		id: "c-mag",
		name: "Magicien",
		data: { hitDie: 6, savingThrows: ["intelligence", "sagesse"] },
	},
	"classe:guerrier": {
		id: "c-gue",
		name: "Guerrier",
		data: {
			hitDie: 10,
			savingThrows: ["force", "constitution"],
			multiclassPrereq: { force: 13 },
		},
	},
	"background:sage": {
		id: "b1",
		name: "Sage",
		data: { skillProficiencies: ["arcanes", "histoire"] },
	},
	"don:vif": {
		id: "d1",
		name: "Vif",
		data: {
			abilityBonuses: { constitution: 1 },
			savingThrows: ["constitution"],
		},
	},
};

const resolve = (ck: string, slug: string) => CONTENT[`${ck}:${slug}`];

const base = {
	raceSlug: "haut-elfe",
	classes: [{ slug: "magicien", level: 3, isPrimary: true }],
	backgroundSlug: "sage",
	abilityMethod: "manual" as const,
	abilityScores: {
		force: 8,
		dexterite: 13,
		constitution: 12,
		intelligence: 15,
		sagesse: 10,
		charisme: 8,
	},
};

describe("buildCharacter", () => {
	test("projette scores, niveau, sauvegardes de classe et sélections", () => {
		const r = buildCharacter(base, resolve);
		expect(r.error).toBeUndefined();
		expect(r.values.dexterite).toBe(15); // 13 + 2 race
		expect(r.values.intelligence).toBe(16); // 15 + 1 race
		expect(r.values.niveau).toBe(3);
		expect(r.values.vitesse).toBe(9);
		expect(r.values.sauvegarde_intelligence).toBe(true);
		expect(r.values.sauvegarde_sagesse).toBe(true);
		expect(r.values.hp).toEqual({ current: 17, max: 17 }); // (6+1)+(4+1)+(4+1)
		expect(r.values.perception).toBe(true); // race
		expect(r.values.arcanes).toBe(true); // background
		const cols = r.selections.map((s) => s.collectionKey);
		expect(cols).toContain("race");
		expect(cols).toContain("background");
		expect(cols).toContain("classe");
	});

	test("don Vif : +1 CON, maîtrise du JdS de Constitution, et sélection don", () => {
		const r = buildCharacter({ ...base, feats: ["vif"] }, resolve);
		expect(r.values.constitution).toBe(13); // 12 + 1 (Vif)
		expect(r.values.sauvegarde_constitution).toBe(true); // accordé par le don
		expect(String(r.values.capacites_traits)).toContain("Don : Vif");
		expect(r.selections.some((s) => s.collectionKey === "don")).toBe(true);
	});

	test("ASI : +2 sur une caractéristique", () => {
		const r = buildCharacter(
			{ ...base, asiAllocations: [{ force: 2 }] },
			resolve,
		);
		expect(r.values.force).toBe(10); // 8 + 2
		expect(r.values.ameliorations).toEqual([{ force: 2 }]);
	});

	test("expertise implique la maîtrise", () => {
		const r = buildCharacter(
			{
				...base,
				skillProficiencies: ["discretion"],
				expertise: ["discretion"],
			},
			resolve,
		);
		expect(r.values.discretion).toBe(true);
		expect(r.values.expertises).toEqual(["discretion"]);
	});

	test("référence invalide → erreur", () => {
		const r = buildCharacter({ ...base, raceSlug: "inconnu" }, resolve);
		expect(r.error).toBeTruthy();
	});

	test("prérequis de multiclassage non respecté → erreur", () => {
		const r = buildCharacter(
			{
				...base,
				classes: [
					{ slug: "magicien", level: 2, isPrimary: true },
					{ slug: "guerrier", level: 1 },
				],
			},
			resolve,
		);
		// force finale 8 < 13 requis par guerrier
		expect(r.error).toContain("multiclassage");
	});
});
