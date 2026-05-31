ALTER TABLE "leagues" ADD COLUMN "paid_tx_id" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_paid_tx_id_unique" UNIQUE("paid_tx_id");