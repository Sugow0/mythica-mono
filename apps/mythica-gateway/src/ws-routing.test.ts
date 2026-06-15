import { describe, expect, it, mock } from "bun:test";

// Redis mocké : éviter toute connexion réseau à l'import (auth/session le charge).
mock.module("./lib/redis", () => ({ redis: { get: mock(async () => null) } }));

const { buildTargetUrl, buildUpstreamHeaders } =
	require("./ws-routing") as typeof import("./ws-routing");

const GAMEPLAY = "http://localhost:2350";
const API = "http://localhost:2250";

describe("buildTargetUrl", () => {
	it("route /gameplay vers le socket gameplay en retirant le préfixe", () => {
		const url = new URL("http://gw/gameplay/sessions/abc/ws");
		expect(buildTargetUrl(url, GAMEPLAY, API)).toBe(
			"ws://localhost:2350/sessions/abc/ws",
		);
	});

	it("route le reste vers le socket API en retirant /api", () => {
		const url = new URL("http://gw/api/ws");
		expect(buildTargetUrl(url, GAMEPLAY, API)).toBe("ws://localhost:2250/ws");
	});

	it("préserve la query string", () => {
		const url = new URL("http://gw/gameplay/sessions/x/ws?token=42");
		expect(buildTargetUrl(url, GAMEPLAY, API)).toBe(
			"ws://localhost:2350/sessions/x/ws?token=42",
		);
	});

	it("retombe sur / quand le chemin se limite au préfixe", () => {
		const url = new URL("http://gw/gameplay");
		expect(buildTargetUrl(url, GAMEPLAY, API)).toBe("ws://localhost:2350/");
	});

	it("convertit https en wss", () => {
		const url = new URL("http://gw/api/ws");
		expect(buildTargetUrl(url, GAMEPLAY, "https://api.prod")).toBe(
			"wss://api.prod/ws",
		);
	});
});

describe("buildUpstreamHeaders", () => {
	it("retourne un objet vide sans utilisateur", () => {
		expect(buildUpstreamHeaders(null)).toEqual({});
	});

	it("injecte l'id utilisateur", () => {
		expect(buildUpstreamHeaders({ id: "u1", role: null })).toEqual({
			"x-user-id": "u1",
		});
	});

	it("injecte aussi le rôle quand présent", () => {
		expect(buildUpstreamHeaders({ id: "u1", role: "ADMIN" })).toEqual({
			"x-user-id": "u1",
			"x-user-role": "ADMIN",
		});
	});
});
