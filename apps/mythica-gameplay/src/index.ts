import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";
import { env } from "./env";
import { startUserSync } from "./events/user-sync";
import { logger } from "./logger";

await startUserSync();

const app = new Elysia()
	.use(elysiaLogger({ instance: logger }))
	.get("/", () => "Hello Elysia")
	.listen(env.PORT);

logger.info(
	`Gameplay service running at http://${app.server?.hostname}:${app.server?.port}`,
);
