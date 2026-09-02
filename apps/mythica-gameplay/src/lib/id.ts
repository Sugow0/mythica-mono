/**
 * Génère un identifiant au format UUID **v7** : ordonné dans le temps (donc
 * indexable efficacement) tout en restant non prédictible. À utiliser pour tous
 * les id générés côté application, en cohérence avec le seed
 * (`prisma/seed.ts`) — les schémas gameplay n'ont pas de `@default`, l'id vient
 * toujours du code.
 */
export function newId(): string {
	return Bun.randomUUIDv7();
}
