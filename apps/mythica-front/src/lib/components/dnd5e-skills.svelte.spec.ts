import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import DnD5eSkills from "./dnd5e-skills.svelte";

// FOR 14 (+2), DEX 16 (+3) ; bonus de maîtrise +2.
const abilities = { force: 14, dexterite: 16 };

describe("DnD5eSkills", () => {
	it("affiche le bonus de compétence sans maîtrise", async () => {
		render(DnD5eSkills, { abilities });
		// Athlétisme (force +2), non maîtrisé → +2.
		await expect
			.element(page.getByTestId("skill-bonus-athletisme"))
			.toHaveTextContent("+2");
	});

	it("ajoute le bonus de maîtrise au clic sur la case", async () => {
		render(DnD5eSkills, { abilities, proficiencyBonus: 2 });
		// Acrobaties (dexterite +3) non maîtrisé → +3.
		await expect
			.element(page.getByTestId("skill-bonus-acrobaties"))
			.toHaveTextContent("+3");
		await page.getByLabelText("Maîtrise Acrobaties").click();
		// Maîtrisé → +3 + 2 = +5.
		await expect
			.element(page.getByTestId("skill-bonus-acrobaties"))
			.toHaveTextContent("+5");
	});

	it("lance un jet avec le bon total (rng injecté)", async () => {
		const onRoll = vi.fn();
		// rng → 0.5 ⇒ roll = floor(0.5*20)+1 = 11.
		render(DnD5eSkills, { abilities, onRoll, rng: () => 0.5 });
		await page.getByLabelText("Lancer Athlétisme").click();
		expect(onRoll).toHaveBeenCalledWith(
			expect.objectContaining({
				label: "Athlétisme",
				roll: 11,
				modifier: 2,
				total: 13,
			})
		);
	});

	it("déclenche l'auto-save après maîtrise (debounce)", async () => {
		const onSave = vi.fn();
		render(DnD5eSkills, { abilities, onSave });
		await page.getByLabelText("Maîtrise Force").click();
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		const last = onSave.mock.calls.at(-1)?.[0] as {
			saves: Record<string, boolean>;
		};
		expect(last.saves.force).toBe(true);
	});
});
