import { describe, expect, it } from "vitest";
import { initials } from "./presence";

describe("initials", () => {
	it("prend la 1re lettre des deux premiers mots", () => {
		expect(initials("Jean Dupont")).toBe("JD");
	});
	it("prend les 2 premières lettres d'un mot unique", () => {
		expect(initials("Gandalf")).toBe("GA");
	});
	it("met en majuscules", () => {
		expect(initials("aria")).toBe("AR");
	});
	it("retombe sur l'identifiant si le pseudo est vide", () => {
		expect(initials("", "ab12cd")).toBe("AB");
		expect(initials(null, "xy")).toBe("XY");
	});
	it("retourne une chaîne vide sans pseudo ni repli", () => {
		expect(initials(null)).toBe("");
	});
});
