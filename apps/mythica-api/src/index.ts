import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import cors from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { campaignsController } from "./campaigns/campaigns.controller";
import { gameSystemsController } from "./game-systems/game-systems.controller";
import { healthController } from "./health.controller";
import { identityController } from "./identity/identity.controller";
import { logger } from "./logger";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3200;
const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3250;

const app = new Elysia()
	.use(elysiaLogger({ instance: logger }))
	.use(healthController)
	.use(
		cors({
			origin: [
				"http://localhost:3000",
				"http://localhost:5173",
				"https://api.staging.mythica.tengram.fr",
				"https://api.mythica.tengram.fr",
				"https://staging.mythica.tengram.fr",
				"https://mythica.tengram.fr",
			],
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			exposeHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.use(
		swagger({
			path: "/swagger",
			documentation: {
				info: {
					title: "Mythica API",
					version: "1.0.0",
					description: "Documentation de l’API Mythica VTT",
				},
				tags: [
					{ name: "App", description: "Endpoints généraux" },
					{
						name: "Identity",
						description:
							"Authentification, inscription, OAuth, gestion du profil",
					},
					{
						name: "Campaigns",
						description:
							"Gestion des campagnes, sessions, membres et invitations",
					},
					{
						name: "GameSystems",
						description: "Gestion des systèmes de jeu et de leurs versions",
					},
					{
						name: "Internal",
						description: "Endpoints réservés aux services internes (MJ IA)",
					},
				],
			},
		}),
	)
	.use(identityController)
	.use(campaignsController)
	.use(gameSystemsController)
	.listen(port);
const ws = new Elysia()
	.ws("/ws", {
		message: (ws, message) => {
			console.log("message", message);
			ws.send(message);
		},
	})
	.listen(wsPort);

logger.info(
	`API running at http://${app.server?.hostname}:${app.server?.port}`,
);
logger.info(
	`Swagger UI: http://${app.server?.hostname}:${app.server?.port}/swagger`,
);
logger.info(`WS running at http://${ws.server?.hostname}:${ws.server?.port}`);
