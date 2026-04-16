import { config } from "@dotenvx/dotenvx";

config({ path: `./config/${process.env.NODE_ENV ?? "development"}.env` });

export const env = {
	PORT: Number(process.env.PORT ?? 2100),
	WS_PORT: Number(process.env.WS_PORT ?? 2150),
	API_URL: process.env.API_URL ?? "http://localhost:2200",
	API_SOCKET_URL: process.env.API_SOCKET_URL ?? "http://localhost:2250",
	GAMEPLAY_URL: process.env.GAMEPLAY_URL ?? "http://localhost:2300",
	GAMEPLAY_SOCKET_URL:
		process.env.GAMEPLAY_SOCKET_URL ?? "http://localhost:2350",
};
