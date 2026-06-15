import { describe, expect, it } from "vitest";
import {
	countOnline,
	parsePresenceEvent,
	roleLabel,
	sessionStatusLabel,
} from "./lobby";

describe("sessionStatusLabel", () => {
	it("traduit les statuts connus", () => {
		expect(sessionStatusLabel("scheduled")).toBe("En attente");
		expect(sessionStatusLabel("active")).toBe("En cours");
		expect(sessionStatusLabel("paused")).toBe("En pause");
		expect(sessionStatusLabel("ended")).toBe("Terminée");
	});

	it("retourne la valeur brute pour un statut inconnu", () => {
		expect(sessionStatusLabel("unknown")).toBe("unknown");
	});
});

describe("roleLabel", () => {
	it("traduit les rôles connus", () => {
		expect(roleLabel("gm")).toBe("MJ");
		expect(roleLabel("player")).toBe("Joueur");
		expect(roleLabel("spectator")).toBe("Spectateur");
	});

	it("retourne la valeur brute pour un rôle inconnu", () => {
		expect(roleLabel("boss")).toBe("boss");
	});
});

describe("parsePresenceEvent", () => {
	it("extrait la liste des utilisateurs", () => {
		expect(parsePresenceEvent('{"users":["a","b"]}')).toEqual({
			users: ["a", "b"],
		});
	});

	it("conserve le statut quand il est présent", () => {
		expect(parsePresenceEvent('{"users":["a"],"status":"active"}')).toEqual({
			users: ["a"],
			status: "active",
		});
	});

	it("ignore un statut non textuel", () => {
		expect(parsePresenceEvent('{"users":[],"status":42}')).toEqual({
			users: [],
		});
	});

	it("retourne null pour un heartbeat ou une trame non-JSON", () => {
		expect(parsePresenceEvent(": ping")).toBeNull();
		expect(parsePresenceEvent("not json")).toBeNull();
	});

	it("retourne null si users n'est pas un tableau", () => {
		expect(parsePresenceEvent('{"status":"active"}')).toBeNull();
		expect(parsePresenceEvent('{"users":"nope"}')).toBeNull();
	});
});

describe("countOnline", () => {
	it("compte les membres présents dans l'ensemble connecté", () => {
		const connected = new Set(["a", "c"]);
		expect(countOnline(["a", "b", "c"], connected)).toBe(2);
	});

	it("retourne 0 quand personne n'est connecté", () => {
		expect(countOnline(["a", "b"], new Set())).toBe(0);
	});
});
