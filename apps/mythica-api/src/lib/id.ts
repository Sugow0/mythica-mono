/**
 * Génère un identifiant au format UUID **v7** : ordonné dans le temps (donc
 * indexable efficacement) tout en restant non prédictible. À utiliser pour les
 * id générés côté application (ex. `userId`), en cohérence avec les défauts
 * Prisma `@default(uuid(7))`.
 */
export function newId(): string {
	return Bun.randomUUIDv7();
}
