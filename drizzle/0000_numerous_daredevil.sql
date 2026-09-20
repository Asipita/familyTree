CREATE TABLE "family_links" (
	"view_id" uuid NOT NULL,
	"id" text NOT NULL,
	"kind" text NOT NULL,
	"from_person_id" text NOT NULL,
	"to_person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_links_view_id_id_pk" PRIMARY KEY("view_id","id")
);
--> statement-breakpoint
CREATE TABLE "family_settings" (
	"view_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"review_notifications" boolean DEFAULT true NOT NULL,
	"discoverable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"viewer_person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_views_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"view_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"born" text NOT NULL,
	"died" text,
	"living" boolean DEFAULT true NOT NULL,
	"biography" text DEFAULT '' NOT NULL,
	"biography_by" text,
	"account_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_view_id_id_pk" PRIMARY KEY("view_id","id"),
	CONSTRAINT "people_view_id_account_user_id" UNIQUE("view_id","account_user_id")
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"view_id" uuid NOT NULL,
	"id" text NOT NULL,
	"kind" text NOT NULL,
	"person_id" text NOT NULL,
	"detail" text NOT NULL,
	"status" text NOT NULL,
	"created" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_view_id_id_pk" PRIMARY KEY("view_id","id")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"view_id" uuid NOT NULL,
	"id" text NOT NULL,
	"subject_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"html" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"updated" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_view_id_id_pk" PRIMARY KEY("view_id","id")
);
--> statement-breakpoint
CREATE TABLE "story_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"view_id" uuid NOT NULL,
	"story_id" text NOT NULL,
	"person_id" text NOT NULL,
	"note" text NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_settings" ADD CONSTRAINT "family_settings_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reviews" ADD CONSTRAINT "story_reviews_view_id_family_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."family_views"("id") ON DELETE cascade ON UPDATE no action;