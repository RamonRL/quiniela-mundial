ALTER TYPE "public"."points_source" ADD VALUE 'match_result' BEFORE 'match_scorer';--> statement-breakpoint
-- Rework de puntuación de partido: nuevas claves por fase (grupos/final) y
-- Solo Ganador por tiers. Borramos las claves del modelo viejo e insertamos
-- las nuevas con sus valores por defecto (editables desde /admin/reglas).
DELETE FROM "scoring_rules" WHERE "key" IN (
  'match_exact_score','match_outcome_only',
  'knockout_qualifier','knockout_score_90','knockout_pens_bonus',
  'solo_winner_correct','solo_winner_pens_bonus'
);--> statement-breakpoint
INSERT INTO "scoring_rules" ("key","value_json","description") VALUES
  ('match_g_exact','{"points":5}','Grupos: marcador exacto'),
  ('match_g_outcome_team','{"points":3}','Grupos: ganador correcto + goles de un equipo'),
  ('match_g_outcome','{"points":2}','Grupos: ganador o empate correcto, sin marcador exacto'),
  ('match_g_team','{"points":1}','Grupos: goles de un equipo, sin acertar el ganador'),
  ('match_ko_draw_exact_pens','{"points":7}','Final: empate exacto (incl. prórroga) + ganador en penaltis'),
  ('match_ko_exact','{"points":5}','Final: marcador exacto (incl. prórroga)'),
  ('match_ko_draw_pens','{"points":4}','Final: empate no exacto + ganador en penaltis'),
  ('match_ko_outcome_team','{"points":3}','Final: ganador correcto + goles de un equipo (incl. prórroga)'),
  ('match_ko_outcome','{"points":2}','Final: ganador/resultado correcto, sin marcador exacto'),
  ('match_ko_team','{"points":1}','Final: goles de un equipo, sin acertar el resultado'),
  ('solo_g_correct','{"points":3}','Solo Ganador · grupos: aciertas el ganador o el empate'),
  ('solo_ko_draw_pens','{"points":5}','Solo Ganador · final: empate (incl. prórroga) + ganador en penaltis'),
  ('solo_ko_correct','{"points":3}','Solo Ganador · final: aciertas ganador o empate, sin el ganador de pens')
ON CONFLICT ("key") DO NOTHING;
