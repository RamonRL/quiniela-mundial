CREATE TABLE "backup_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"object_key" text,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "backup_runs_kind_finished_idx" ON "backup_runs" USING btree ("kind","finished_at");