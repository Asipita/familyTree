ALTER TABLE "family_links" ADD COLUMN "relation" text;--> statement-breakpoint
ALTER TABLE "family_links" ADD COLUMN "complete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "family_views" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "gender" text;