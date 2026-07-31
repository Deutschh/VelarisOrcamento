CREATE TABLE "quote_acceptances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_id" uuid NOT NULL,
	"quote_version_id" uuid NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"request_code" text NOT NULL,
	"proposal_code" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_whatsapp" text NOT NULL,
	"customer_email" text,
	"final_total" numeric(12, 2) NOT NULL,
	"terms_version" text NOT NULL,
	"privacy_policy_version" text NOT NULL,
	"estimate_disclaimer_version" text NOT NULL,
	"company_terms_version" text,
	"legal_snapshot" jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb,
	"accepted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_quote_version_id_quote_versions_id_fk" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_acceptances" ADD CONSTRAINT "quote_acceptances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quote_acceptances_quote_version_unique" ON "quote_acceptances" USING btree ("quote_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_acceptances_idempotency_key_unique" ON "quote_acceptances" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "quote_acceptances_quote_idx" ON "quote_acceptances" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quote_acceptances_request_idx" ON "quote_acceptances" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quote_acceptances_company_idx" ON "quote_acceptances" USING btree ("company_id");