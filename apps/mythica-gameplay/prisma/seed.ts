import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { OFFICIAL_GAME_SYSTEMS } from "../src/game-systems/official-systems";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});

async function main() {
	const idBySlug = new Map(OFFICIAL_GAME_SYSTEMS.map((s) => [s.slug, s.id]));
	// Insérer les systèmes parents avant leurs enfants (FK parentSystemId).
	const ordered = [...OFFICIAL_GAME_SYSTEMS].sort(
		(a, b) => Number(a.parentSlug !== null) - Number(b.parentSlug !== null),
	);

	for (const s of ordered) {
		const parentSystemId = s.parentSlug
			? (idBySlug.get(s.parentSlug) ?? null)
			: null;
		await prisma.gameSystem.upsert({
			where: { slug: s.slug },
			create: {
				id: s.id,
				nom: s.nom,
				version: s.version,
				slug: s.slug,
				isOfficial: s.isOfficial,
				description: s.description,
				parentSystemId,
			},
			update: {
				nom: s.nom,
				version: s.version,
				isOfficial: s.isOfficial,
				description: s.description,
				parentSystemId,
			},
		});
		console.log(`✔ game system seedé : ${s.slug}`);
	}
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
