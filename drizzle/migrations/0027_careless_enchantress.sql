CREATE TABLE IF NOT EXISTS "league_sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"alt" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "league_sponsors" ADD CONSTRAINT "league_sponsors_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_sponsors_league_idx" ON "league_sponsors" USING btree ("league_id","order_index");
