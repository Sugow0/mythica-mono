import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, request }) => {
	const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
	const cookieHeader = request.headers.get("cookie") ?? "";
	const headers = { Cookie: cookieHeader };

	const res = await fetch(`${apiUrl}/game-systems/?page=1&limit=100`, {
		headers,
	});

	if (!res.ok) {
		return { gameSystems: [] };
	}

	const body = await res.json();
	const gameSystems = body?.gameSystems ?? [];

	return { gameSystems };
};

export const actions: Actions = {
	create: async ({ request, fetch }) => {
		const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();

		const name = formData.get("name")?.toString().trim();
		const description = formData.get("description")?.toString().trim();

		if (!name) {
			return fail(400, { action: "create", error: "Le nom est requis." });
		}

		const res = await fetch(`${apiUrl}/game-systems/`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookieHeader },
			body: JSON.stringify({ name, description: description || undefined }),
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

	delete: async ({ request, fetch }) => {
		const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();
		const id = formData.get("id")?.toString();

		if (!id) {
			return fail(400, { action: "delete", error: "ID manquant." });
		}

		const res = await fetch(`${apiUrl}/game-systems/${id}`, {
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

	addVersion: async ({ request, fetch }) => {
		const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();

		const gameSystemId = formData.get("gameSystemId")?.toString();
		const version = formData.get("version")?.toString().trim();

		if (!gameSystemId || !version) {
			return fail(400, {
				action: "addVersion",
				gameSystemId,
				error: "Le numéro de version est requis.",
			});
		}

		const res = await fetch(`${apiUrl}/game-systems/${gameSystemId}/versions`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Cookie: cookieHeader },
			body: JSON.stringify({ version }),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, {
				action: "addVersion",
				gameSystemId,
				error: body?.error ?? "Erreur lors de l'ajout.",
			});
		}

		return { success: true, action: "addVersion", gameSystemId };
	},

	deleteVersion: async ({ request, fetch }) => {
		const apiUrl = `${import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:2100"}/api`;
		const cookieHeader = request.headers.get("cookie") ?? "";
		const formData = await request.formData();

		const gameSystemId = formData.get("gameSystemId")?.toString();
		const versionId = formData.get("versionId")?.toString();

		if (!gameSystemId || !versionId) {
			return fail(400, {
				action: "deleteVersion",
				gameSystemId,
				error: "IDs manquants.",
			});
		}

		const res = await fetch(
			`${apiUrl}/game-systems/${gameSystemId}/versions/${versionId}`,
			{
				method: "DELETE",
				headers: { Cookie: cookieHeader },
			}
		);

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, {
				action: "deleteVersion",
				gameSystemId,
				error: body?.error ?? "Erreur lors de la suppression.",
			});
		}

		return { success: true, action: "deleteVersion", gameSystemId };
	},
};
