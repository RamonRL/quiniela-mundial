CREATE TYPE "public"."commercial_lead_status" AS ENUM('new', 'contacted', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."league_tier" AS ENUM('free', 'team-50', 'team-100', 'team-250', 'enterprise');--> statement-breakpoint
CREATE TABLE "commercial_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"expected_members" integer,
	"message" text,
	"status" "commercial_lead_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "member_limit" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "tier" "league_tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "paid_amount_eur" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "paid_via" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "announcement" text;--> statement-breakpoint
CREATE INDEX "commercial_leads_status_idx" ON "commercial_leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "commercial_leads_created_idx" ON "commercial_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leagues_tier_idx" ON "leagues" USING btree ("tier");--> statement-breakpoint
-- Backfill: ligas privadas existentes arrancan con el límite Free (20).
-- La pública (is_public = true) se queda con NULL = sin tope.
UPDATE "leagues" SET "member_limit" = 20 WHERE "is_public" = false AND "member_limit" IS NULL;