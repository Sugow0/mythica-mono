import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";
import { env } from "./env";
import { logger } from "./logger";

const app = new Elysia()
	.use(elysiaLogger({ instance: logger }))
	.get("/", () => "Hello Elysia")
	.listen(env.PORT);

logger.info(
	`Gameplay service running at http://${app.server?.hostname}:${app.server?.port}`,
);
