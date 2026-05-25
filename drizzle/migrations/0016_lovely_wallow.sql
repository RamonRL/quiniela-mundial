CREATE TYPE "public"."pending_payment_method" AS ENUM('bizum', 'bank', 'paypal', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pending_payment_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "pending_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"league_id" integer,
	"tier" "league_tier" NOT NULL,
	"method" "pending_payment_method" DEFAULT 'unknown' NOT NULL,
	"price_eur" integer NOT NULL,
	"concept" text NOT NULL,
	"email" text,
	"name" text,
	"status" "pending_payment_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_payments" ADD CONSTRAINT "pending_payments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_payments" ADD CONSTRAINT "pending_payments_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_payments_status_idx" ON "pending_payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "pending_payments_league_idx" ON "pending_payments" USING btree ("league_id");