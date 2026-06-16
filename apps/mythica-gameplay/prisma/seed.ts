import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { COC_CHARACTER_SHEET_PROPERTIES } from "../src/game-systems/coc-properties";
import {
	COC_PROPERTY_MAPPINGS,
	COC_SYSTEM_SLUG,
} from "../src/game-systems/coc-system-properties";
import { DND5E_2024_EXTRA_PROPERTIES } from "../src/game-systems/dnd5e-2024-properties";
import {
	DND5E_2024_PROPERTY_MAPPINGS,
	DND5E_2024_SYSTEM_SLUG,
} from "../src/game-systems/dnd5e-2024-system-properties";
import { DND5E_CHARACTER_SHEET_PROPERTIES } from "../src/game-systems/dnd5e-properties";
import {
	DND5E_PROPERTY_MAPPINGS,
	DND5E_SYSTEM_SLUG,
	type GameSystemPropertyMapping,
} from "../src/game-systems/dnd5e-system-properties";
import { OFFICIAL_GAME_SYSTEMS } from "../src/game-systems/official-systems";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});

/**
 * Seede le mapping système ↔ propriété d'un système donné dans
 * `game_system_properties`. Résolution par clés naturelles : `slug` (système)
 * et `key` (propriété), donc partageable entre systèmes (D&D 5e 2024 réutilise
 * les `property_id` de 2014). Idempotence par le couple unique
 * (gameSystemId, propertyId) ; l'id (UUID v7) n'est généré qu'à la création.
 */
async function seedSystemMappings(
	slug: string,
	mappings: GameSystemPropertyMapping[],
): Promise<void> {
	const gameSystem = await prisma.gameSystem.findUnique({
		where: { slug },
		select: { id: true },
	});
	if (!gameSystem) {
		throw new Error(
			`Système introuvable pour le mapping : slug="${slug}". Seede d'abord les systèmes.`,
		);
	}
	const gameSystemId = gameSystem.id;

	for (const m of mappings) {
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
			`✔ mapping système↔propriété seedé : ${slug} ↔ ${m.propertyKey}`,
		);
	}
}

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

	// Catalogue des propriétés de fiche (indépendant d'un système) : base D&D 5e
	// 2014 + nouveautés spécifiques 2024 (ex. épuisement numérique).
	// Idempotence par `key` ; l'id (UUID v7) n'est généré qu'à la création.
	const properties = [
		...DND5E_CHARACTER_SHEET_PROPERTIES,
		...DND5E_2024_EXTRA_PROPERTIES,
		...COC_CHARACTER_SHEET_PROPERTIES,
	];
	for (const p of properties) {
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

	// Mapping système ↔ propriété. D&D 5e 2024 réutilise les propriétés 2014
	// (mêmes property_id) en plus de ses nouveautés.
	await seedSystemMappings(DND5E_SYSTEM_SLUG, DND5E_PROPERTY_MAPPINGS);
	await seedSystemMappings(
		DND5E_2024_SYSTEM_SLUG,
		DND5E_2024_PROPERTY_MAPPINGS,
	);
	await seedSystemMappings(COC_SYSTEM_SLUG, COC_PROPERTY_MAPPINGS);
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
