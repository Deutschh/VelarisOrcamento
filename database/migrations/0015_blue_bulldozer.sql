ALTER TABLE "price_change_requests" RENAME TO "company_price_change_requests";--> statement-breakpoint
ALTER TABLE "company_price_change_requests" DROP CONSTRAINT "price_change_requests_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "company_price_change_requests" DROP CONSTRAINT "price_change_requests_requested_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "company_price_change_requests" DROP CONSTRAINT "price_change_requests_service_id_company_services_id_fk";
--> statement-breakpoint
ALTER TABLE "company_price_change_requests" DROP CONSTRAINT "price_change_requests_resolved_by_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "price_change_requests_company_status_idx";--> statement-breakpoint
DROP INDEX "price_change_requests_status_idx";--> statement-breakpoint
DROP INDEX "price_change_requests_created_at_idx";--> statement-breakpoint
ALTER TABLE "company_price_change_requests" ADD CONSTRAINT "company_price_change_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_price_change_requests" ADD CONSTRAINT "company_price_change_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_price_change_requests" ADD CONSTRAINT "company_price_change_requests_service_id_company_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."company_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_price_change_requests" ADD CONSTRAINT "company_price_change_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_price_change_requests_company_status_idx" ON "company_price_change_requests" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "company_price_change_requests_status_idx" ON "company_price_change_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "company_price_change_requests_created_at_idx" ON "company_price_change_requests" USING btree ("created_at");