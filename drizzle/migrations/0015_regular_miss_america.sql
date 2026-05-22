CREATE TABLE "league_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_memberships" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "league_departments" ADD CONSTRAINT "league_departments_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_departments_league_name_idx" ON "league_departments" USING btree ("league_id","name");--> statement-breakpoint
CREATE INDEX "league_departments_league_idx" ON "league_departments" USING btree ("league_id");--> statement-breakpoint
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_department_id_league_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."league_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_memberships_dept_idx" ON "league_memberships" USING btree ("department_id");