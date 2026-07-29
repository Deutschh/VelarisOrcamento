CREATE TABLE "company_internal_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"author_user_id" uuid,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "profile_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "profile_unpublished_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_internal_notes" ADD CONSTRAINT "company_internal_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_internal_notes" ADD CONSTRAINT "company_internal_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_internal_notes_company_idx" ON "company_internal_notes" USING btree ("company_id");