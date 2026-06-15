/** Options de hachage de mot de passe (argon2id), partagées par l'application. */
export const PASSWORD_HASH_OPTIONS = {
	algorithm: "argon2id" as const,
	memoryCost: 19_456,
	timeCost: 2,
};

/** Hache un mot de passe en clair avec argon2id. */
export async function hashPassword(plain: string): Promise<string> {
	return Bun.password.hash(plain, PASSWORD_HASH_OPTIONS);
}
