import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { authContext } from "./auth/context";
import { campaignsController } from "./campaigns/campaigns.controller";
import { sessionsController } from "./campaigns/sessions.controller";
import { sessionsWs } from "./campaigns/sessions.ws";
import { env } from "./env";
import { startUserSync } from "./events/user-sync";
import { gameSystemsController } from "./game-systems/game-systems.controller";
import { healthController } from "./health.controller";
import { logger } from "./logger";

await startUserSync();

const app = new Elysia()
	.use(elysiaLogger({ instance: logger }))
	.use(healthController)
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
					{ name: "Sessions", description: "Sessions de jeu et présence" },
				],
			},
		}),
	)
	.use(authContext)
	.get("/", () => "Hello Elysia")
	.use(gameSystemsController)
	.use(campaignsController)
	.use(sessionsController)
	.listen(env.PORT);

// Serveur WebSocket dédié (le gateway proxifie ws://…/gameplay/* vers ce port).
const ws = new Elysia().use(sessionsWs).listen(env.WS_PORT);

logger.info(
	`Gameplay service running at http://${app.server?.hostname}:${app.server?.port}`,
);
logger.info(
	`Gameplay WS running at ws://${ws.server?.hostname}:${ws.server?.port}`,
);
