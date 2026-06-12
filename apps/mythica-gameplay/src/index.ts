import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { authContext } from "./auth/context";
import { env } from "./env";
import { startUserSync } from "./events/user-sync";
import { gameSystemsController } from "./game-systems/game-systems.controller";
import { logger } from "./logger";

await startUserSync();

const app = new Elysia()
	.use(elysiaLogger({ instance: logger }))
	.use(
		swagger({
			path: "/swagger",
			documentation: {
				info: {
					title: "Mythica Gameplay API",
					version: "1.0.0",
					description: "API du service gameplay (systèmes de jeu, campagnes)",
				},
				tags: [
					{ name: "GameSystems", description: "Systèmes de jeu" },
					{ name: "Campaigns", description: "Campagnes, membres et sessions" },
				],
			},
		}),
	)
	.use(authContext)
	.get("/", () => "Hello Elysia")
	.use(gameSystemsController)
	.listen(env.PORT);

logger.info(
	`Gameplay service running at http://${app.server?.hostname}:${app.server?.port}`,
);
