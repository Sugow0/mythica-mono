import { config } from "@dotenvx/dotenvx";

// overload: true : force la réécriture des vars déjà définies par Bun (.env
// auto-chargé au démarrage). Évite le drift si un .env local contient une URL
// conflictuelle (ex: prisma+postgres:// généré par `prisma dev`).
config({
	path: `./config/${process.env.NODE_ENV ?? "development"}.env`,
	overload: true,
});
