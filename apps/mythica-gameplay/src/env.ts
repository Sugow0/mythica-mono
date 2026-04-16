import { config } from "@dotenvx/dotenvx";

config({ path: `./config/${process.env.NODE_ENV ?? "development"}.env` });

export const env = {
	PORT: Number(process.env.PORT ?? 3300),
	WS_PORT: Number(process.env.WS_PORT ?? 3350),
};
