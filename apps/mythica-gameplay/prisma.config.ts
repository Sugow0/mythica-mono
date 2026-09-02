import { config } from "@dotenvx/dotenvx";
import { defineConfig } from "prisma/config";

config({ path: `./config/${process.env.NODE_ENV ?? "development"}.env` });

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "bun run prisma/seed.ts",
	},
	datasource: {
		url: process.env.DATABASE_URL,
	},
});
