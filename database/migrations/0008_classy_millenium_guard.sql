CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quote_version_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'superseded');--> statement-breakpoint
CREATE TABLE "quote_version_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_version_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"from_status" "quote_version_status",
	"to_status" "quote_version_status",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_version_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_version_id" uuid NOT NULL,
	"item_id" text,
	"label" text NOT NULL,
	"quantity" integer NOT NULL,
	"internal_total" numeric(12, 2) NOT NULL,
	"final_total" numeric(12, 2) NOT NULL,
	"snapshot" jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_id" uuid NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"proposal_code" text NOT NULL,
	"status" "quote_version_status" DEFAULT 'draft' NOT NULL,
	"internal_total" numeric(12, 2) NOT NULL,
	"estimate_min" numeric(12, 2) NOT NULL,
	"estimate_max" numeric(12, 2) NOT NULL,
	"final_total" numeric(12, 2) NOT NULL,
	"out_of_range_reason" text,
	"valid_until" timestamp with time zone NOT NULL,
	"terms" text,
	"terms_version" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by_user_id" uuid,
	"sent_by_user_id" uuid,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"accepted_quote_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_version_events" ADD CONSTRAINT "quote_version_events_quote_version_id_quote_versions_id_fk" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_version_events" ADD CONSTRAINT "quote_version_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_version_items" ADD CONSTRAINT "quote_version_items_quote_version_id_quote_versions_id_fk" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_version_events_version_idx" ON "quote_version_events" USING btree ("quote_version_id");--> statement-breakpoint
CREATE INDEX "quote_version_items_version_idx" ON "quote_version_items" USING btree ("quote_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_versions_quote_version_unique" ON "quote_versions" USING btree ("quote_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_versions_proposal_code_unique" ON "quote_versions" USING btree ("proposal_code");--> statement-breakpoint
CREATE INDEX "quote_versions_request_idx" ON "quote_versions" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quote_versions_company_status_idx" ON "quote_versions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "quote_versions_valid_until_idx" ON "quote_versions" USING btree ("valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_quote_request_unique" ON "quotes" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quotes_company_status_idx" ON "quotes" USING btree ("company_id","status");