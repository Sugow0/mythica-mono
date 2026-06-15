import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import DnD5eSpells from "./dnd5e-spells.svelte";

const spells = [
	{ id: "1", name: "Lumière", level: 0 },
	{ id: "2", name: "Boule de feu", level: 3 },
];

describe("DnD5eSpells", () => {
	it("groupe les sorts par niveau", async () => {
		render(DnD5eSpells, { values: { spells } });
		await expect.element(page.getByText("Tours de magie")).toBeInTheDocument();
		await expect.element(page.getByText("Niveau 3")).toBeInTheDocument();
	});

	it("consomme un emplacement de sort au clic", async () => {
		const onSave = vi.fn();
		render(DnD5eSpells, {
			values: { slots: { 1: { max: 3, used: 0 } } },
			onSave,
		});
		await page.getByLabelText("Emplacement 1-1").click();
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		expect(onSave.mock.calls.at(-1)?.[0].slots[1].used).toBe(1);
	});

	it("ajoute un sort", async () => {
		render(DnD5eSpells, { values: { spells: [] } });
		await expect.element(page.getByText("Aucun sort.")).toBeInTheDocument();
		await page.getByRole("button", { name: "Ajouter un sort" }).click();
		expect(page.getByLabelText("Nom du sort").all()).toHaveLength(1);
	});

	it("ajoute une capacité", async () => {
		const onSave = vi.fn();
		render(DnD5eSpells, { values: { abilities: [] }, onSave });
		await page.getByRole("button", { name: "Ajouter une capacité" }).click();
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		expect(onSave.mock.calls.at(-1)?.[0].abilities).toHaveLength(1);
	});
});
