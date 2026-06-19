-- Contraintes d'intégrité base (curseur « hybride ») pour les fiches de
-- personnage. Complète la validation applicative (TypeBox) par des garde-fous
-- Postgres que le JSONB seul n'offre pas.
--
-- Non exprimables dans le schéma Prisma (CHECK sur JSONB) : appliquées via
--   bun run --cwd apps/mythica-gameplay prisma db execute \
--     --file prisma/sql/character-sheet-integrity.sql
-- Idempotent : DROP IF EXISTS puis ADD.

-- La valeur d'une propriété peut être un scalaire (number/text/boolean), un
-- objet (resource {current,max}, list {items}) — mais jamais le JSON `null` :
-- l'absence de valeur se traduit par l'objet vide `{}` (défaut de colonne).
-- On nettoie au passage l'ancienne contrainte « objet seulement », trop stricte.
ALTER TABLE "character_sheet_values"
	DROP CONSTRAINT IF EXISTS "chk_sheet_values_object";
ALTER TABLE "character_sheet_values"
	DROP CONSTRAINT IF EXISTS "chk_sheet_values_not_null";
ALTER TABLE "character_sheet_values"
	ADD CONSTRAINT "chk_sheet_values_not_null"
	CHECK (jsonb_typeof("value") <> 'null');

-- Même invariant pour les overrides de token en session.
ALTER TABLE "session_token_overrides"
	DROP CONSTRAINT IF EXISTS "chk_token_overrides_object";
ALTER TABLE "session_token_overrides"
	DROP CONSTRAINT IF EXISTS "chk_token_overrides_not_null";
ALTER TABLE "session_token_overrides"
	ADD CONSTRAINT "chk_token_overrides_not_null"
	CHECK (jsonb_typeof("value") <> 'null');

-- L'or de départ ne peut pas être négatif.
ALTER TABLE "character_sheets"
	DROP CONSTRAINT IF EXISTS "chk_character_sheets_gold_positive";
ALTER TABLE "character_sheets"
	ADD CONSTRAINT "chk_character_sheets_gold_positive"
	CHECK ("gold" IS NULL OR "gold" >= 0);

-- Niveau d'une sélection (ex. niveau de classe) borné 1..20 ; quantité >= 1.
ALTER TABLE "character_sheet_selections"
	DROP CONSTRAINT IF EXISTS "chk_sheet_selections_level";
ALTER TABLE "character_sheet_selections"
	ADD CONSTRAINT "chk_sheet_selections_level"
	CHECK ("level" IS NULL OR ("level" >= 1 AND "level" <= 20));
ALTER TABLE "character_sheet_selections"
	DROP CONSTRAINT IF EXISTS "chk_sheet_selections_qty";
ALTER TABLE "character_sheet_selections"
	ADD CONSTRAINT "chk_sheet_selections_qty"
	CHECK ("qty" IS NULL OR "qty" >= 1);
