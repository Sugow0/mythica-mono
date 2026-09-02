import { config } from "@dotenvx/dotenvx";

// overload: true force la réécriture des vars déjà définies (ex: .env auto-
// chargé par Bun avec l'URL prisma+postgres de dev local qui prend le dessus).
config({
	path: `./config/${process.env.NODE_ENV ?? "development"}.env`,
	overload: true,
});

// Bun résout "localhost" en ::1 (IPv6) dans certains contextes ; pg et le
// query engine Prisma ne gèrent pas bien ce cas. On force 127.0.0.1.
if (process.env.DATABASE_URL) {
	process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
		/localhost/g,
		"127.0.0.1",
	);
}
if (process.env.REDIS_URL) {
	process.env.REDIS_URL = process.env.REDIS_URL.replace(
		/localhost/g,
		"127.0.0.1",
	);
}

export const env = {
	PORT: Number(process.env.PORT ?? 3300),
	WS_PORT: Number(process.env.WS_PORT ?? 3350),
	REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
};
