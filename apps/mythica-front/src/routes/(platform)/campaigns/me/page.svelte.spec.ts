import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

// Le dashboard charge les campagnes au montage : on neutralise le service.
vi.mock("$lib/index.js", () => ({
	ApiError: class ApiError extends Error {},
	campaignService: {
		getMyCampaigns: vi.fn(async () => ({ success: true, items: [] })),
	},
}));

import Page from "./+page.svelte";

describe("/campaigns/me (dashboard)", () => {
	it("affiche le titre et l'appel à l'action quand l'utilisateur est connecté", async () => {
		render(Page, { data: { user: { id: "u1", pseudo: "Bob" } } });

		const heading = page.getByRole("heading", {
			level: 1,
			name: /Mes campagnes/i,
		});
		await expect.element(heading).toBeInTheDocument();
		await expect
			.element(page.getByRole("link", { name: /Creer une campagne/i }).first())
			.toBeInTheDocument();
	});

	it("invite à se connecter si aucun utilisateur", async () => {
		render(Page, { data: { user: null } });
		await expect
			.element(page.getByText(/Connexion requise/i))
			.toBeInTheDocument();
	});
});
