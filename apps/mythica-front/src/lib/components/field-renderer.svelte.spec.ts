import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import type { CharacterSheetField } from "$lib/api/services/character-service";
import FieldRenderer from "./field-renderer.svelte";

function field(over: Partial<CharacterSheetField> = {}): CharacterSheetField {
	return {
		propertyId: "p1",
		key: "force",
		label: "Force",
		type: "number",
		options: null,
		defaultValue: null,
		description: null,
		groupName: null,
		displayOrder: 0,
		isRequired: false,
		formula: null,
		value: null,
		...over,
	} as CharacterSheetField;
}

describe("FieldRenderer", () => {
	it("rend un champ number et émet un nombre", async () => {
		const onChange = vi.fn();
		render(FieldRenderer, { property: field(), value: 10, onChange });

		const input = page.getByLabelText("Force");
		await expect.element(input).toBeInTheDocument();
		await input.fill("14");
		expect(onChange).toHaveBeenLastCalledWith(14);
	});

	it("rend un champ boolean (checkbox) et émet un booléen", async () => {
		const onChange = vi.fn();
		render(FieldRenderer, {
			property: field({ key: "insp", label: "Inspiration", type: "boolean" }),
			value: false,
			onChange,
		});
		await page.getByRole("checkbox").click();
		expect(onChange).toHaveBeenLastCalledWith(true);
	});

	it("rend un select avec les options et émet la valeur choisie", async () => {
		const onChange = vi.fn();
		render(FieldRenderer, {
			property: field({
				key: "align",
				label: "Alignement",
				type: "select",
				options: { values: ["loyal", "neutre", "chaotique"] },
			}),
			value: "",
			onChange,
		});
		await page.getByLabelText("Alignement").selectOptions("chaotique");
		expect(onChange).toHaveBeenLastCalledWith("chaotique");
	});

	it("affiche un champ derived en lecture seule (placeholder si vide)", async () => {
		render(FieldRenderer, {
			property: field({
				key: "initiative",
				label: "Initiative",
				type: "derived",
				formula: "dex_modifier",
			}),
			value: null,
		});
		const input = page.getByLabelText("Initiative");
		await expect.element(input).toHaveValue("—");
		await expect.element(input).toBeDisabled();
	});

	it("marque le champ requis d'un astérisque", async () => {
		render(FieldRenderer, {
			property: field({ isRequired: true }),
			value: null,
		});
		await expect.element(page.getByText("*")).toBeInTheDocument();
	});

	it("rend une resource avec deux entrées current/max", async () => {
		const onChange = vi.fn();
		render(FieldRenderer, {
			property: field({ key: "hp", label: "PV", type: "resource" }),
			value: { current: 8, max: 10 },
			onChange,
		});
		await expect.element(page.getByLabelText("PV actuel")).toHaveValue(8);
		await expect.element(page.getByLabelText("PV max")).toHaveValue(10);
		await page.getByLabelText("PV actuel").fill("5");
		expect(onChange).toHaveBeenLastCalledWith({ current: 5, max: 10 });
	});
});
