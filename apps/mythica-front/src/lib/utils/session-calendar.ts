/**
 * Helpers purs pour le calendrier mensuel des sessions de campagne.
 * Aucune dépendance au DOM : testables en environnement node.
 */

export interface CalendarDay {
	date: Date;
	/** Clé locale `YYYY-MM-DD` du jour. */
	key: string;
	/** Vrai si le jour appartient au mois affiché (pas un jour de débordement). */
	inMonth: boolean;
}

/** Clé locale stable d'une date au format `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/** Indice du jour de la semaine en commençant le lundi (lundi = 0, dimanche = 6). */
function mondayFirstIndex(date: Date): number {
	return (date.getDay() + 6) % 7;
}

/**
 * Construit une grille de 6 semaines (42 jours) pour le mois donné, débutant le
 * lundi. Les jours des mois adjacents nécessaires au remplissage sont marqués
 * `inMonth: false`.
 *
 * @param year Année (ex: 2026)
 * @param month Mois indexé à partir de 0 (0 = janvier)
 */
export function buildCalendar(year: number, month: number): CalendarDay[][] {
	const first = new Date(year, month, 1);
	const start = new Date(year, month, 1 - mondayFirstIndex(first));

	const weeks: CalendarDay[][] = [];
	const cursor = start;
	for (let w = 0; w < 6; w++) {
		const week: CalendarDay[] = [];
		for (let d = 0; d < 7; d++) {
			const date = new Date(
				cursor.getFullYear(),
				cursor.getMonth(),
				cursor.getDate()
			);
			week.push({
				date,
				key: dayKey(date),
				inMonth: date.getMonth() === month,
			});
			cursor.setDate(cursor.getDate() + 1);
		}
		weeks.push(week);
	}
	return weeks;
}

/**
 * Regroupe des éléments datés par jour local (clé `YYYY-MM-DD`).
 * Les éléments sans date valide sont ignorés.
 */
export function groupByDay<T extends { scheduledAt?: unknown }>(
	items: T[]
): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const item of items) {
		const raw = item.scheduledAt;
		if (raw === null || raw === undefined || typeof raw === "object") continue;
		const date = new Date(raw as string | number);
		if (Number.isNaN(date.getTime())) continue;
		const key = dayKey(date);
		const list = map.get(key);
		if (list) list.push(item);
		else map.set(key, [item]);
	}
	return map;
}

const MONTHS = [
	"janvier",
	"février",
	"mars",
	"avril",
	"mai",
	"juin",
	"juillet",
	"août",
	"septembre",
	"octobre",
	"novembre",
	"décembre",
];

/** Libellé `mois année` pour un mois donné (mois indexé à partir de 0). */
export function monthLabel(year: number, month: number): string {
	return `${MONTHS[month]} ${year}`;
}

/** Décale (year, month) de `delta` mois en gérant les changements d'année. */
export function shiftMonth(
	year: number,
	month: number,
	delta: number
): { year: number; month: number } {
	const total = year * 12 + month + delta;
	return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}
