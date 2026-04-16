const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;

export { TOTP_PERIOD, TOTP_DIGITS };

export function generateSecretBytes(): Uint8Array {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return bytes;
}

export function secretToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToSecret(hex: string): Uint8Array {
	const len = hex.length / 2;
	const out = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}
