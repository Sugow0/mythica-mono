export type Point = { x: number; y: number };
export type Segment = { p1: Point; p2: Point };

function getIntersection(
	rayOrigin: Point,
	rayDir: { dx: number; dy: number },
	segment: Segment
): { point: Point; t1: number } | null {
	const rpx = rayOrigin.x;
	const rpy = rayOrigin.y;
	const rdx = rayDir.dx;
	const rdy = rayDir.dy;

	const spx = segment.p1.x;
	const spy = segment.p1.y;
	const sdx = segment.p2.x - segment.p1.x;
	const sdy = segment.p2.y - segment.p1.y;

	const cross = rdx * sdy - rdy * sdx;
	// S'ils sont parallèles, pas d'intersection
	if (Math.abs(cross) < 0.000001) return null;

	const t1 = ((spx - rpx) * sdy - (spy - rpy) * sdx) / cross;
	const t2 = ((spx - rpx) * rdy - (spy - rpy) * rdx) / cross;

	// t1 doit être > 0 (le rayon va en avant)
	// t2 doit être entre 0 et 1 (l'intersection est sur le segment)
	if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
		return {
			point: {
				x: rpx + rdx * t1,
				y: rpy + rdy * t1,
			},
			t1: t1,
		};
	}
	return null;
}

export function computeVisibilityPolygon(
	origin: Point,
	walls: Segment[],
	mapWidth: number,
	mapHeight: number,
	radius?: number
): Point[] {
	// Ajouter les bords de la carte comme murs pour borner la vision
	// Si un radius est défini, on limite la vision à une boîte autour de l'origine
	const minX = radius ? Math.max(0, origin.x - radius) : 0;
	const minY = radius ? Math.max(0, origin.y - radius) : 0;
	const maxX = radius ? Math.min(mapWidth, origin.x + radius) : mapWidth;
	const maxY = radius ? Math.min(mapHeight, origin.y + radius) : mapHeight;

	const allWalls = [...walls];
	allWalls.push({ p1: { x: minX, y: minY }, p2: { x: maxX, y: minY } });
	allWalls.push({ p1: { x: maxX, y: minY }, p2: { x: maxX, y: maxY } });
	allWalls.push({ p1: { x: maxX, y: maxY }, p2: { x: minX, y: maxY } });
	allWalls.push({ p1: { x: minX, y: maxY }, p2: { x: minX, y: minY } });

	// Filtrer les murs qui sont complètement en dehors de la bounding box (optimisation)
	const relevantWalls = allWalls.filter((w) => {
		const wxMin = Math.min(w.p1.x, w.p2.x);
		const wxMax = Math.max(w.p1.x, w.p2.x);
		const wyMin = Math.min(w.p1.y, w.p2.y);
		const wyMax = Math.max(w.p1.y, w.p2.y);
		return !(wxMax < minX || wxMin > maxX || wyMax < minY || wyMin > maxY);
	});

	// Extraire tous les points uniques
	const points: Point[] = [];
	for (const wall of relevantWalls) {
		points.push(wall.p1);
		points.push(wall.p2);
	}

	const uniqueAngles: number[] = [];
	for (const p of points) {
		const angle = Math.atan2(p.y - origin.y, p.x - origin.x);
		uniqueAngles.push(angle - 0.00001, angle, angle + 0.00001);
	}

	const intersects: Array<{ angle: number; point: Point; t1: number }> = [];

	for (const angle of uniqueAngles) {
		let closestIntersect: { point: Point; t1: number } | null = null;

		for (const wall of relevantWalls) {
			const intersect = getIntersection(
				origin,
				{ dx: Math.cos(angle), dy: Math.sin(angle) },
				wall
			);
			if (!intersect) continue;

			if (!closestIntersect || intersect.t1 < closestIntersect.t1) {
				closestIntersect = intersect;
			}
		}

		if (closestIntersect) {
			intersects.push({
				angle,
				point: closestIntersect.point,
				t1: closestIntersect.t1,
			});
		}
	}

	// Trier par angle
	intersects.sort((a, b) => a.angle - b.angle);

	// Retourner le polygone
	return intersects.map((i) => i.point);
}
