/**
 * Valide la clé de service pour les endpoints internes (MJ IA).
 * Lit le header X-Service-Key et compare à la variable d'env SERVICE_API_KEY.
 */
export function validateServiceKey(request: Request): boolean {
	const key = request.headers.get("X-Service-Key");
	return !!key && key === process.env.SERVICE_API_KEY;
}
