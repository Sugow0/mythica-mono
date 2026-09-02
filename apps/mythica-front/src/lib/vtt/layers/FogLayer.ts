// FogLayer supprimé : le fog est désormais rendu via un <canvas> 2D overlay
// dans VttCanvas.svelte avec globalCompositeOperation = "destination-out".
// Ce fichier est conservé vide pour ne pas casser les imports existants.
export class FogLayer {
	constructor(_stage: unknown) {}
	setFog(_fog: unknown, _config: unknown) {}
	toggle(_active: boolean) {}
	destroy() {}
}
