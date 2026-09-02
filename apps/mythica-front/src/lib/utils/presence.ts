/** Helpers d'affichage de la présence — testables hors composant. */

/**
 * Initiales (2 lettres max) à afficher dans un avatar.
 * Dérivées du pseudo (1re lettre des deux premiers mots, sinon 2 premières
 * lettres), avec repli sur l'identifiant si le pseudo est vide.
 */
export function initials(
	pseudo: string | null | undefined,
	fallback = ""
): string {
	const source = (pseudo ?? "").trim();
	if (source) {
		const parts = source.split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return source.slice(0, 2).toUpperCase();
	}
	return fallback.slice(0, 2).toUpperCase();
}
