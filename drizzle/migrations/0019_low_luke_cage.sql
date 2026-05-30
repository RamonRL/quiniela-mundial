CREATE TYPE "public"."patch_note_type" AS ENUM('feature', 'fix', 'improvement', 'note');--> statement-breakpoint
CREATE TABLE "patch_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "patch_note_type" DEFAULT 'note' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "patch_notes_published_idx" ON "patch_notes" USING btree ("published_at");