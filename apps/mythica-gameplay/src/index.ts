import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { authContext } from "./auth/context";
import { campaignCharacterSheetsController } from "./campaigns/campaign-character-sheets.controller";
import { campaignsController } from "./campaigns/campaigns.controller";
import { encountersController } from "./campaigns/encounters.controller";
import { sessionsController } from "./campaigns/sessions.controller";
import { sessionsWs } from "./campaigns/sessions.ws";
import { characterContentController } from "./character-content/character-content.controller";
import { characterSheetsController } from "./character-sheets/character-sheets.controller";
import { contentImportController } from "./content-import/content-import.controller";
import { env } from "./env";
import { startUserSync } from "./events/user-sync";
import { filesController } from "./files/files.controller";
import { characterSheetPropertiesController } from "./game-systems/character-sheet-properties.controller";
import { gameSystemsController } from "./game-systems/game-systems.controller";
import { healthController } from "./health.controller";
import { logger } from "./logger";
import { mapsController } from "./maps/maps.controller";

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
					{
						name: "CharacterSheetProperties",
						description: "Propriétés de fiches de personnage",
					},
					{
						name: "CharacterSheets",
						description: "Fiches de personnage",
					},
					{
						name: "CharacterContent",
						description: "Contenu et parcours de création des systèmes",
					},
					{ name: "Campaigns", description: "Campagnes, membres et sessions" },
					{ name: "Encounters", description: "Rencontres" },
					{ name: "Sessions", description: "Sessions de jeu et présence" },
					{ name: "Maps", description: "Maps des sessions de jeu" },
				],
			},
		}),
	)
	.use(authContext)
	.get("/", () => "Hello Elysia")
	.use(gameSystemsController)
	.use(characterSheetPropertiesController)
	.use(characterContentController)
	.use(characterSheetsController)
	.use(campaignsController)
	.use(campaignCharacterSheetsController)
	.use(encountersController)
	.use(sessionsController)
	.use(mapsController)
	.use(filesController)
	.use(contentImportController)
	.listen(env.PORT);

// Serveur WebSocket dédié (le gateway proxifie ws://…/gameplay/* vers ce port).
const ws = new Elysia().use(sessionsWs).listen(env.WS_PORT);

logger.info(
	`Gameplay service running at http://${app.server?.hostname}:${app.server?.port}`,
);
logger.info(
	`Gameplay WS running at ws://${ws.server?.hostname}:${ws.server?.port}`,
);
