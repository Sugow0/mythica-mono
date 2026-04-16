import { config } from "@dotenvx/dotenvx";

config({ path: `./config/${process.env.NODE_ENV ?? "development"}.env` });
