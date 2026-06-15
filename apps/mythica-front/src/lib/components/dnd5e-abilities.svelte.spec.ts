import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import DnD5eAbilities from "./dnd5e-abilities.svelte";

describe("DnD5eAbilities", () => {
	it("affiche le modificateur calculé depuis le score initial", async () => {
		render(DnD5eAbilities, { values: { force: 16 } });
		// Force 16 → +3 ; les autres à 10 par défaut → +0.
		await expect.element(page.getByTestId("mod-force")).toHaveTextContent("+3");
		await expect
			.element(page.getByTestId("mod-dexterite"))
			.toHaveTextContent("+0");
	});

	it("recalcule le modificateur à l'édition", async () => {
		render(DnD5eAbilities, { values: { force: 10 } });
		const input = page.getByLabelText("Force");
		await input.fill("8");
		await expect.element(page.getByTestId("mod-force")).toHaveTextContent("-1");
	});

	it("déclenche l'auto-save (debounce) après édition", async () => {
		const onSave = vi.fn();
		render(DnD5eAbilities, { values: { force: 10 }, onSave });
		await page.getByLabelText("Constitution").fill("14");
		// L'auto-save est groupé sur 1 s.
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		const last = onSave.mock.calls.at(-1)?.[0] as Record<string, number>;
		expect(last.constitution).toBe(14);
	});
});
