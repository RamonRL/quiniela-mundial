CREATE TABLE "pending_scorers" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"team_id" integer,
	"provider_player_id" integer,
	"player_name" text NOT NULL,
	"minute" smallint,
	"is_own_goal" boolean DEFAULT false NOT NULL,
	"is_penalty" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "provider_fixture_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_source" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "provider_player_id" integer;--> statement-breakpoint
ALTER TABLE "pending_scorers" ADD CONSTRAINT "pending_scorers_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_scorers" ADD CONSTRAINT "pending_scorers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_scorers_match_idx" ON "pending_scorers" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_scorers_dedup_idx" ON "pending_scorers" USING btree ("match_id","provider_player_id","minute");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_provider_idx" ON "matches" USING btree ("provider_fixture_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_provider_idx" ON "players" USING btree ("provider_player_id");