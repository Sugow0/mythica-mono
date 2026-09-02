import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import DnD5eHp from "./dnd5e-hp.svelte";

describe("DnD5eHp", () => {
	it("affiche les PV courants et le maximum", async () => {
		render(DnD5eHp, { values: { current: 18, max: 24 } });
		await expect
			.element(page.getByTestId("hp-current"))
			.toHaveTextContent("18");
	});

	it("PV -1 réduit les PV courants", async () => {
		render(DnD5eHp, { values: { current: 18, max: 24 } });
		await page.getByLabelText("PV -1").click();
		await expect
			.element(page.getByTestId("hp-current"))
			.toHaveTextContent("17");
	});

	it("les dégâts entament d'abord les PV temporaires", async () => {
		render(DnD5eHp, { values: { current: 20, max: 30, temp: 5 } });
		await page.getByLabelText("Montant").fill("8");
		await page.getByRole("button", { name: "Dégâts" }).click();
		// 8 dégâts : 5 absorbés par les temp, 3 sur les PV → 17.
		await expect
			.element(page.getByTestId("hp-current"))
			.toHaveTextContent("17");
	});

	it("les soins ne dépassent pas le maximum", async () => {
		render(DnD5eHp, { values: { current: 28, max: 30 } });
		await page.getByLabelText("Montant").fill("10");
		await page.getByRole("button", { name: "Soins" }).click();
		await expect
			.element(page.getByTestId("hp-current"))
			.toHaveTextContent("30");
	});

	it("déclenche l'auto-save après une modification de PV", async () => {
		const onSave = vi.fn();
		render(DnD5eHp, { values: { current: 20, max: 30 }, onSave });
		await page.getByLabelText("PV -1").click();
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		expect(onSave.mock.calls.at(-1)?.[0]).toMatchObject({ current: 19 });
	});
});
