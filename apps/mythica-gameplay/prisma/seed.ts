import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DND5E_CHARACTER_SHEET_PROPERTIES } from "../src/game-systems/dnd5e-properties";
import {
	DND5E_PROPERTY_MAPPINGS,
	DND5E_SYSTEM_SLUG,
} from "../src/game-systems/dnd5e-system-properties";
import { OFFICIAL_GAME_SYSTEMS } from "../src/game-systems/official-systems";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});

async function main() {
	// Insérer les systèmes parents avant leurs enfants (FK parentSystemId).
	const ordered = [...OFFICIAL_GAME_SYSTEMS].sort(
		(a, b) => Number(a.parentSlug !== null) - Number(b.parentSlug !== null),
	);

	for (const s of ordered) {
		// Idempotence par `slug` ; l'id (UUID v7) n'est généré qu'à la création.
		// Le parent est déjà inséré (ordre ci-dessus) : on récupère son id réel.
		let parentSystemId: string | null = null;
		if (s.parentSlug) {
			const parent = await prisma.gameSystem.findUnique({
				where: { slug: s.parentSlug },
				select: { id: true },
			});
			parentSystemId = parent?.id ?? null;
		}
		await prisma.gameSystem.upsert({
			where: { slug: s.slug },
			create: {
				id: Bun.randomUUIDv7(),
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

	// Catalogue des propriétés de fiche D&D 5e (indépendant d'un système ;
	// le mapping système ↔ propriété est traité dans FEAT-160).
	// Idempotence par `key` ; l'id (UUID v7) n'est généré qu'à la création.
	for (const p of DND5E_CHARACTER_SHEET_PROPERTIES) {
		await prisma.characterSheetProperty.upsert({
			where: { key: p.key },
			create: {
				id: Bun.randomUUIDv7(),
				key: p.key,
				label: p.label,
				type: p.type,
				defaultValue: p.defaultValue ?? null,
				options: p.options ?? undefined,
				description: p.description ?? null,
			},
			update: {
				label: p.label,
				type: p.type,
				defaultValue: p.defaultValue ?? null,
				options: p.options ?? undefined,
				description: p.description ?? null,
			},
		});
		console.log(`✔ propriété de fiche seedée : ${p.key}`);
	}

	// Mapping système ↔ propriété pour D&D 5e (2014) dans `game_system_properties`.
	// Résolu par clés naturelles : `slug` (système) et `key` (propriété).
	// Idempotence par le couple unique (gameSystemId, propertyId) ;
	// l'id (UUID v7) n'est généré qu'à la création.
	const gameSystem = await prisma.gameSystem.findUnique({
		where: { slug: DND5E_SYSTEM_SLUG },
		select: { id: true },
	});
	if (!gameSystem) {
		throw new Error(
			`Système introuvable pour le mapping : slug="${DND5E_SYSTEM_SLUG}". Seede d'abord les systèmes.`,
		);
	}
	const gameSystemId = gameSystem.id;

	for (const m of DND5E_PROPERTY_MAPPINGS) {
		const property = await prisma.characterSheetProperty.findUnique({
			where: { key: m.propertyKey },
			select: { id: true },
		});
		if (!property) {
			throw new Error(
				`Propriété introuvable pour le mapping : key="${m.propertyKey}". Seede d'abord les propriétés.`,
			);
		}
		const propertyId = property.id;

		await prisma.gameSystemProperty.upsert({
			where: { gameSystemId_propertyId: { gameSystemId, propertyId } },
			create: {
				id: Bun.randomUUIDv7(),
				gameSystemId,
				propertyId,
				displayOrder: m.displayOrder,
				groupName: m.groupName,
				isRequired: m.isRequired,
				formula: m.formula ?? null,
			},
			update: {
				displayOrder: m.displayOrder,
				groupName: m.groupName,
				isRequired: m.isRequired,
				formula: m.formula ?? null,
			},
		});
		console.log(
			`✔ mapping système↔propriété seedé : ${DND5E_SYSTEM_SLUG} ↔ ${m.propertyKey}`,
		);
	}
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
