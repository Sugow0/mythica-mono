import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import DnD5eNotes from "./dnd5e-notes.svelte";

describe("DnD5eNotes", () => {
	it("affiche les sections en édition", async () => {
		render(DnD5eNotes, {});
		await expect.element(page.getByLabelText("Histoire")).toBeInTheDocument();
		await expect
			.element(page.getByLabelText("Notes de session"))
			.toBeInTheDocument();
	});

	it("rend le Markdown en aperçu", async () => {
		render(DnD5eNotes, { values: { backstory: "**héros**" } });
		await page.getByRole("button", { name: "Aperçu" }).click();
		const preview = page.getByTestId("preview-backstory");
		await expect.element(preview).toBeInTheDocument();
		// Le gras est rendu en <strong>.
		await expect.element(preview.getByText("héros")).toBeInTheDocument();
	});

	it("déclenche l'auto-save à la saisie", async () => {
		const onSave = vi.fn();
		render(DnD5eNotes, { onSave });
		await page.getByLabelText("Alliés").fill("Gandalf");
		await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), {
			timeout: 2000,
		});
		expect(onSave.mock.calls.at(-1)?.[0].allies).toBe("Gandalf");
	});
});
