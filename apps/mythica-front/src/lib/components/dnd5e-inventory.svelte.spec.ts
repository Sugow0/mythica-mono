import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import DnD5eInventory from "./dnd5e-inventory.svelte";

const items = [
	{ id: "1", name: "Torche", quantity: 2, weight: 1, equipped: false },
	{ id: "2", name: "Corde", quantity: 1, weight: 3, equipped: false },
];

describe("DnD5eInventory", () => {
	it("calcule la charge totale", async () => {
		render(DnD5eInventory, { values: { items } });
		// 2×1 + 1×3 = 5.
		await expect
			.element(page.getByTestId("inventory-total"))
			.toHaveTextContent("5");
	});

	it("ajoute puis retire un objet", async () => {
		render(DnD5eInventory, { values: { items } });
		await page.getByRole("button", { name: "Ajouter un objet" }).click();
		expect(page.getByLabelText("Nom de l'objet").all()).toHaveLength(3);
		await page
			.getByRole("button", { name: "Supprimer l'objet" })
			.first()
			.click();
		expect(page.getByLabelText("Nom de l'objet").all()).toHaveLength(2);
	});

	it("calcule le bonus d'attaque d'une arme (mod + maîtrise)", async () => {
		render(DnD5eInventory, {
			abilities: { force: 16 },
			proficiencyBonus: 2,
			values: {
				weapons: [
					{ id: "w1", name: "Épée", ability: "force", proficient: true },
				],
			},
		});
		// FOR 16 → +3 ; maîtrisé +2 → +5.
		await expect
			.element(page.getByTestId("weapon-attack-0"))
			.toHaveTextContent("+5");
	});

	it("déclenche l'auto-save à l'ajout d'un objet", async () => {
		const onSave = vi.fn();
		render(DnD5eInventory, { values: { items: [] }, onSave });
		await page.getByRole("button", { name: "Ajouter un objet" }).click();
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		expect(onSave.mock.calls.at(-1)?.[0].items).toHaveLength(1);
	});
});
