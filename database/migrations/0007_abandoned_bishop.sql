ALTER TYPE "public"."quote_request_status" ADD VALUE 'under_review';--> statement-breakpoint
ALTER TYPE "public"."quote_request_status" ADD VALUE 'awaiting_information';--> statement-breakpoint
ALTER TYPE "public"."quote_request_status" ADD VALUE 'accepted_for_proposal';--> statement-breakpoint
ALTER TYPE "public"."quote_request_status" ADD VALUE 'declined_by_company';--> statement-breakpoint
ALTER TYPE "public"."quote_request_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."quote_request_status" ADD VALUE 'archived';--> statement-breakpoint
CREATE TABLE "quote_request_answer_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"item_id" text,
	"field_code" text NOT NULL,
	"original_value" jsonb NOT NULL,
	"revised_value" jsonb NOT NULL,
	"reason" text,
	"impact_amount" numeric(12, 2),
	"configuration_version" integer NOT NULL,
	"pricing_version" integer NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_request_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"from_status" "quote_request_status",
	"to_status" "quote_request_status",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_request_answer_revisions" ADD CONSTRAINT "quote_request_answer_revisions_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_answer_revisions" ADD CONSTRAINT "quote_request_answer_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_events" ADD CONSTRAINT "quote_request_events_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_events" ADD CONSTRAINT "quote_request_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_request_answer_revisions_request_idx" ON "quote_request_answer_revisions" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quote_request_events_request_idx" ON "quote_request_events" USING btree ("quote_request_id");