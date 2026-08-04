CREATE TYPE "public"."price_change_request_status" AS ENUM('open', 'under_review', 'approved', 'rejected', 'implemented');--> statement-breakpoint
CREATE TABLE "price_change_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"service_id" uuid,
	"status" "price_change_request_status" DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"resolution_note" text,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_change_requests" ADD CONSTRAINT "price_change_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_requests" ADD CONSTRAINT "price_change_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_requests" ADD CONSTRAINT "price_change_requests_service_id_company_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."company_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_requests" ADD CONSTRAINT "price_change_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_change_requests_company_status_idx" ON "price_change_requests" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "price_change_requests_status_idx" ON "price_change_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_change_requests_created_at_idx" ON "price_change_requests" USING btree ("created_at");