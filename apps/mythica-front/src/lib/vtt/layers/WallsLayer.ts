import { Container, Graphics } from "pixi.js";
import type { SessionWallDto } from "../types";
import { vttState } from "../vtt.svelte";

export class WallsLayer {
	private container: Container;
	private graphics: Graphics;
	private walls: SessionWallDto[] = [];
	private gridSize = 100;

	constructor(stage: Container) {
		this.container = new Container();
		this.graphics = new Graphics();
		this.container.addChild(this.graphics);
		stage.addChild(this.container);
	}

	setGridSize(size: number) {
		this.gridSize = size;
		this.draw();
	}

	setWalls(walls: SessionWallDto[]) {
		this.walls = walls;
		this.draw();
	}

	draw() {
		this.graphics.clear();
		// Only GM can see walls in this layer (players will only see the effect via FogLayer)
		if (!vttState.isGm) {
			return;
		}

		for (const wall of this.walls) {
			let color = 0x00ffff; // Cyan par défaut (normal)
			if (wall.type === "invisible") color = 0xff00ff; // Magenta (invisible)
			if (wall.type === "door") color = 0xffff00; // Jaune (porte)
			if (wall.type === "window") color = 0x00ff00; // Vert (fenêtre)

			this.graphics.moveTo(Number(wall.p1X), Number(wall.p1Y));
			this.graphics.lineTo(Number(wall.p2X), Number(wall.p2Y));
			this.graphics.stroke({ width: 4, color, alpha: 0.8 });

			// Dessiner des poignées
			this.graphics.circle(Number(wall.p1X), Number(wall.p1Y), 6);
			this.graphics.fill({ color, alpha: 1 });
			this.graphics.circle(Number(wall.p2X), Number(wall.p2Y), 6);
			this.graphics.fill({ color, alpha: 1 });
		}
	}

	destroy() {
		this.graphics.destroy();
		this.container.destroy();
	}
}
