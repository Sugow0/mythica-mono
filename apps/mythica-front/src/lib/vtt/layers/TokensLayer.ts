// apps/mythica-front/src/lib/vtt/layers/TokensLayer.ts
import { Container, type Application } from "pixi.js";
import type { SessionTokenDto } from "../types";
import {
	TokenSprite,
	type TokenMoveCallback,
	type TokenSelectCallback,
} from "../tokens/TokenSprite";
import { vttState } from "../vtt.svelte";

export class TokensLayer {
	private container: Container;
	private sprites: Map<string, TokenSprite> = new Map();
	private onMove: TokenMoveCallback;
	private onSelect: TokenSelectCallback;
	private gridSize = 100;

	constructor(stage: Container, _app: Application, onMove?: TokenMoveCallback) {
		this.container = new Container();
		this.container.sortableChildren = true;
		this.onMove = onMove ?? (() => {});
		this.onSelect = (tokenId) => vttState.setSelectedTokenId(tokenId);
		stage.addChild(this.container);
	}

	setOnMove(cb: TokenMoveCallback) {
		this.onMove = cb;
	}

	setGridSize(size: number) {
		this.gridSize = size;
	}

	setTokens(tokens: SessionTokenDto[]) {
		// Détruire les sprites qui n'existent plus
		for (const [id, sprite] of this.sprites) {
			if (!tokens.find((t) => t.id === id)) {
				sprite.destroy();
				this.sprites.delete(id);
			}
		}
		// Créer ou mettre à jour
		for (const token of tokens) {
			const existing = this.sprites.get(token.id);
			if (existing) {
				existing.update(token);
			} else {
				const sprite = new TokenSprite(
					token,
					this.onMove,
					this.onSelect,
					this.gridSize
				);
				this.container.addChild(sprite.container);
				this.sprites.set(token.id, sprite);
			}
		}
	}

	syncTokens(tokens: SessionTokenDto[]) {
		this.setTokens(tokens);
	}

	addToken(token: SessionTokenDto) {
		const sprite = new TokenSprite(
			token,
			this.onMove,
			this.onSelect,
			this.gridSize
		);
		this.container.addChild(sprite.container);
		this.sprites.set(token.id, sprite);
	}

	removeToken(id: string) {
		const sprite = this.sprites.get(id);
		if (sprite) {
			sprite.destroy();
			this.sprites.delete(id);
		}
	}

	updateToken(token: Partial<SessionTokenDto> & { id: string }) {
		this.sprites.get(token.id)?.update(token as SessionTokenDto);
	}

	destroy() {
		this.container.destroy({ children: true });
	}
}
