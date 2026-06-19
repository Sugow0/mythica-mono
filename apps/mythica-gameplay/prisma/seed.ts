import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { COC_CHARACTER_SHEET_PROPERTIES } from "../src/game-systems/coc-properties";
import {
	COC_PROPERTY_MAPPINGS,
	COC_SYSTEM_SLUG,
} from "../src/game-systems/coc-system-properties";
import {
	type CreationStepSeed,
	DND5E_2014_SLUG,
	DND5E_CONTENT,
	DND5E_CREATION_FLOW,
	type SystemContentSeed,
} from "../src/game-systems/dnd5e-2014";
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
import { PF2E_CHARACTER_SHEET_PROPERTIES } from "../src/game-systems/pf2e-properties";
import {
	PF2E_PROPERTY_MAPPINGS,
	PF2E_SYSTEM_SLUG,
} from "../src/game-systems/pf2e-system-properties";

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

/**
 * Seede le contenu d'un système (races, classes, sorts...) dans `system_content`.
 * Idempotence par le couple naturel (gameSystemId, collectionKey, slug) ; l'id
 * (UUID v7) n'est généré qu'à la création.
 */
async function seedSystemContent(
	slug: string,
	content: SystemContentSeed[],
): Promise<void> {
	const gameSystem = await prisma.gameSystem.findUnique({
		where: { slug },
		select: { id: true },
	});
	if (!gameSystem) {
		throw new Error(
			`Système introuvable pour le contenu : slug="${slug}". Seede d'abord les systèmes.`,
		);
	}
	const gameSystemId = gameSystem.id;

	for (const c of content) {
		await prisma.systemContent.upsert({
			where: {
				gameSystemId_collectionKey_slug: {
					gameSystemId,
					collectionKey: c.collectionKey,
					slug: c.slug,
				},
			},
			create: {
				id: Bun.randomUUIDv7(),
				gameSystemId,
				collectionKey: c.collectionKey,
				slug: c.slug,
				name: c.name,
				description: c.description ?? null,
				data: c.data,
				sortOrder: c.sortOrder ?? 0,
			},
			update: {
				name: c.name,
				description: c.description ?? null,
				data: c.data,
				sortOrder: c.sortOrder ?? 0,
			},
		});
	}

	// Élague le contenu orphelin (plus présent dans le seed) tant qu'il n'est
	// référencé par aucune sélection de fiche (FK Restrict).
	const keptSlugs = content.map((c) => c.slug);
	const orphans = await prisma.systemContent.findMany({
		where: {
			gameSystemId,
			slug: { notIn: keptSlugs },
			selections: { none: {} },
		},
		select: { id: true, slug: true },
	});
	if (orphans.length > 0) {
		await prisma.systemContent.deleteMany({
			where: { id: { in: orphans.map((o) => o.id) } },
		});
		console.log(
			`✔ contenu orphelin élagué : ${orphans.map((o) => o.slug).join(", ")}`,
		);
	}

	console.log(`✔ contenu seedé : ${slug} (${content.length} entrées)`);
}

/**
 * Seede le parcours de création d'un système dans `game_system_creation_steps`.
 * Idempotence par (gameSystemId, stepKey).
 */
async function seedCreationFlow(
	slug: string,
	steps: CreationStepSeed[],
): Promise<void> {
	const gameSystem = await prisma.gameSystem.findUnique({
		where: { slug },
		select: { id: true },
	});
	if (!gameSystem) {
		throw new Error(
			`Système introuvable pour le flow : slug="${slug}". Seede d'abord les systèmes.`,
		);
	}
	const gameSystemId = gameSystem.id;

	for (const s of steps) {
		await prisma.gameSystemCreationStep.upsert({
			where: {
				gameSystemId_stepKey: { gameSystemId, stepKey: s.stepKey },
			},
			create: {
				id: Bun.randomUUIDv7(),
				gameSystemId,
				stepKey: s.stepKey,
				order: s.order,
				kind: s.kind,
				config: s.config,
				condition: s.condition ?? null,
			},
			update: {
				order: s.order,
				kind: s.kind,
				config: s.config,
				condition: s.condition ?? null,
			},
		});
	}
	console.log(`✔ flow de création seedé : ${slug} (${steps.length} étapes)`);
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
		...PF2E_CHARACTER_SHEET_PROPERTIES,
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
	await seedSystemMappings(PF2E_SYSTEM_SLUG, PF2E_PROPERTY_MAPPINGS);

	// Contenu D&D 5e 2014 (races, classes, backgrounds, sorts, équipement) et
	// parcours de création data-driven.
	await seedSystemContent(DND5E_2014_SLUG, DND5E_CONTENT);
	await seedCreationFlow(DND5E_2014_SLUG, DND5E_CREATION_FLOW);
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
