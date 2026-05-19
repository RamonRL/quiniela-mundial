CREATE TYPE "public"."news_category" AS ENUM('convocatoria', 'previa', 'cronica', 'analisis', 'lesion', 'sorteo', 'destacada');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"seo_title" text,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"cover_url" text,
	"cover_alt" text,
	"category" "news_category" NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"related_team_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"related_match_id" integer,
	"author_id" uuid,
	"status" "news_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "news_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_related_match_id_matches_id_fk" FOREIGN KEY ("related_match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_articles_status_published_idx" ON "news_articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "news_articles_category_idx" ON "news_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "news_articles_related_match_idx" ON "news_articles" USING btree ("related_match_id");--> statement-breakpoint
CREATE INDEX "news_articles_tags_gin" ON "news_articles" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "news_articles_related_teams_gin" ON "news_articles" USING gin ("related_team_codes");