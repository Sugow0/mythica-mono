import { describe, expect, it } from "bun:test";
import { avatarObjectKey, BUCKET_AVATARS } from "../avatar-storage";

describe("avatar-storage", () => {
	it("construit une clé objet déterministe par fiche", () => {
		expect(avatarObjectKey("abc")).toBe("abc/avatar");
		expect(avatarObjectKey("abc")).toBe(avatarObjectKey("abc"));
	});

	it("expose un nom de bucket non vide", () => {
		expect(BUCKET_AVATARS.length).toBeGreaterThan(0);
	});
});
