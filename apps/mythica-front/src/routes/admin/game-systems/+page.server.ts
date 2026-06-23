import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

function gameplayUrl(): string {
	const base = (
		import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"
	).replace(/\/+$/, "");
	return `${base}/gameplay`;
}

export const load: PageServerLoad = async ({ fetch, request }) => {
	const cookieHeader = request.headers.get("cookie") ?? "";

	const res = await fetch(`${gameplayUrl()}/game-systems/?page=1&limit=100`, {
		headers: { Cookie: cookieHeader },
	});

	if (!res.ok) {
		return { gameSystems: [] };
	}

	const body = await res.json();
	return { gameSystems: body?.items ?? [] };
};

export const actions: Actions = {
	create: async ({ request, fetch }) => {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();

		const nom = formData.get("nom")?.toString().trim();
		const version = formData.get("version")?.toString().trim();
		const slug = formData.get("slug")?.toString().trim();
		const description = formData.get("description")?.toString().trim();
		const parentSystemId = formData.get("parentSystemId")?.toString().trim();
		const isOfficial = formData.get("isOfficial") === "on";

		if (!nom || !version || !slug) {
			return fail(400, {
				action: "create",
				error: "Le nom, la version et le slug sont requis.",
			});
		}

		const res = await fetch(`${gameplayUrl()}/game-systems/`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookieHeader },
			body: JSON.stringify({
				nom,
				version,
				slug,
				description: description || undefined,
				parentSystemId: parentSystemId || undefined,
				isOfficial: isOfficial || undefined,
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, {
				action: "create",
				error: body?.error ?? "Erreur lors de la création.",
			});
		}

		return { success: true, action: "create" };
	},

	update: async ({ request, fetch }) => {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();

		const id = formData.get("id")?.toString();
		const nom = formData.get("nom")?.toString().trim();
		const version = formData.get("version")?.toString().trim();
		const slug = formData.get("slug")?.toString().trim();
		const description = formData.get("description")?.toString().trim();
		const parentSystemId = formData.get("parentSystemId")?.toString().trim();
		const isOfficial = formData.get("isOfficial") === "on";

		if (!id) {
			return fail(400, { action: "update", error: "ID manquant." });
		}
		if (!nom || !version || !slug) {
			return fail(400, {
				action: "update",
				error: "Le nom, la version et le slug sont requis.",
			});
		}

		const res = await fetch(`${gameplayUrl()}/game-systems/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", Cookie: cookieHeader },
			body: JSON.stringify({
				nom,
				version,
				slug,
				description: description || undefined,
				parentSystemId: parentSystemId || undefined,
				isOfficial,
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, {
				action: "update",
				error: body?.error ?? "Erreur lors de la modification.",
			});
		}

		return { success: true, action: "update" };
	},

	delete: async ({ request, fetch }) => {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();
		const id = formData.get("id")?.toString();

		if (!id) {
			return fail(400, { action: "delete", error: "ID manquant." });
		}

		const res = await fetch(`${gameplayUrl()}/game-systems/${id}`, {
			method: "DELETE",
			headers: { Cookie: cookieHeader },
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, {
				action: "delete",
				error: body?.error ?? "Erreur lors de la suppression.",
			});
		}

		return { success: true, action: "delete" };
	},
};
