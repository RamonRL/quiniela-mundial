CREATE TYPE "public"."prediction_mode" AS ENUM('completo', 'marcador', 'solo_ganador');--> statement-breakpoint
ALTER TYPE "public"."points_source" ADD VALUE 'solo_winner';--> statement-breakpoint
ALTER TYPE "public"."points_source" ADD VALUE 'solo_winner_pens';--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "prediction_mode" "prediction_mode" DEFAULT 'completo' NOT NULL;--> statement-breakpoint
-- La quiniela pública existente pasa a ser la de modo "completo".
UPDATE "leagues"
SET "name" = 'Quiniela pública (Completo)', "prediction_mode" = 'completo'
WHERE "slug" = 'liga-principal';--> statement-breakpoint
-- Dos nuevas quinielas públicas, una por modo. Arrancan sin miembros.
INSERT INTO "leagues" ("slug", "name", "description", "invite_token", "is_public", "prediction_mode", "created_at")
VALUES (
  'quiniela-publica-marcador',
  'Quiniela pública (Marcador)',
  'Quiniela pública de modo Marcador: predice el marcador exacto de cada partido.',
  'PUBLIC-MARCADOR',
  true,
  'marcador',
  now()
)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "leagues" ("slug", "name", "description", "invite_token", "is_public", "prediction_mode", "created_at")
VALUES (
  'quiniela-publica-ganador',
  'Quiniela pública (Ganador)',
  'Quiniela pública de modo Solo Ganador: predice solo quién gana cada partido.',
  'PUBLIC-GANADOR',
  true,
  'solo_ganador',
  now()
)
ON CONFLICT ("slug") DO NOTHING;