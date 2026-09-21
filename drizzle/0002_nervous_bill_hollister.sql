CREATE TABLE "family_members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"view_id" uuid NOT NULL,
	"person_id" text NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"email" text NOT NULL,
	"review_notifications" boolean DEFAULT true NOT NULL,
	"discoverable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_view_person" UNIQUE("view_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"view_id" uuid NOT NULL,
	"person_id" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "family_views" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
UPDATE "people" SET "created_by_user_id" = "family_views"."owner_user_id"
FROM "family_views" WHERE "people"."view_id" = "family_views"."id";--> statement-breakpoint
ALTER TABLE "people" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
INSERT INTO "family_members" ("user_id", "view_id", "person_id", "onboarding_complete", "email", "review_notifications", "discoverable")
SELECT v."owner_user_id", v."id", v."viewer_person_id", v."onboarding_complete",
  COALESCE(s."email", ''), COALESCE(s."review_notifications", true), COALESCE(s."discoverable", false)
FROM "family_views" v LEFT JOIN "family_settings" s ON s."view_id" = v."id";--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_members_view" ON "family_members" USING btree ("view_id");--> statement-breakpoint
CREATE INDEX "invitations_view_person" ON "invitations" USING btree ("view_id","person_id");
