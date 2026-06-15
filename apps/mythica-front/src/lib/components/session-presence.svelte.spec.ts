import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import SessionPresence from "./session-presence.svelte";

const members = [
	{ userId: "u1", pseudo: "Aria" },
	{ userId: "u2", pseudo: "Borin" },
];

describe("SessionPresence", () => {
	it("affiche le nombre de joueurs en ligne", async () => {
		render(SessionPresence, { members, connectedIds: ["u1"] });
		await expect.element(page.getByText("1 en ligne")).toBeInTheDocument();
	});

	it("affiche les initiales des membres", async () => {
		render(SessionPresence, { members, connectedIds: ["u1"] });
		await expect.element(page.getByText("AR")).toBeInTheDocument();
		await expect.element(page.getByText("BO")).toBeInTheDocument();
	});

	it("aucun en ligne quand personne n'est connecté", async () => {
		render(SessionPresence, { members, connectedIds: [] });
		await expect.element(page.getByText("0 en ligne")).toBeInTheDocument();
	});
});
