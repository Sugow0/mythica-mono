/** Fonction debounce générique : reporte l'appel tant que les appels s'enchaînent. */
export function debounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	delayMs: number
): ((...args: Args) => void) & { cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const debounced = (...args: Args) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			fn(...args);
		}, delayMs);
	};

	debounced.cancel = () => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	return debounced;
}
